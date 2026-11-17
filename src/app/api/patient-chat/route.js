/**
 * POST /api/patient-chat
 * Patient-specific chatbot with longitudinal clinical history
 */

import { verifyAuth, initializeDb } from '../../../../backend/database/connection.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.join(__filename, '../../../../../../');
const dbPath = path.join(projectRoot, 'database', 'clara.db');

async function callGeminiAPI(clinicalDataStr, question, apiKey) {
  if (!apiKey) {
    return {
      success: true,
      source: 'sql',
      answer: clinicalDataStr,
      note: 'Structured clinical summary. For natural-language responses, configure Gemini API key.'
    };
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a clinical summarization assistant. Generate a comprehensive patient-specific summary based on the clinical data and question.\n\nCLINICAL DATA:\n${clinicalDataStr}\n\nDOCTOR'S QUESTION:\n${question}\n\nRequirements: Be specific to this patient, include dates and values, highlight changes across admissions, do not invent information.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response';

    return {
      success: true,
      source: 'gemini',
      answer: answer
    };
  } catch (error) {
    console.error('[GEMINI] Error:', error);
    return {
      success: true,
      source: 'sql',
      answer: clinicalDataStr,
      error: error.message,
      note: 'LLM generation failed. Returning structured clinical summary instead.'
    };
  }
}

export async function POST(request) {
  try {
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { patientId, question } = body;

    if (!patientId || !question) {
      return new Response(
        JSON.stringify({ success: false, error: 'Patient ID and question are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dbInitialized = initializeDb();
    if (!dbInitialized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    try {
      const patientNum = parseInt(patientId);
      const isMimic = patientNum >= 10000000;

      // Retrieve patient data
      let patient, admissions = [], diagnoses = [], prescriptions = [], labevents = [], icustays = [], isClaraPatient = false;

      if (isMimic) {
        patient = db.prepare(`SELECT subject_id, gender, anchor_age, anchor_year, dod FROM patients WHERE subject_id = ?`).get(patientNum);
        if (!patient) {
          return new Response(JSON.stringify({ success: false, error: `Patient ${patientId} not found` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        admissions = db.prepare(`SELECT hadm_id, admittime, dischtime, admission_type, admission_location, discharge_location, hospital_expire_flag FROM admissions WHERE subject_id = ? ORDER BY admittime ASC`).all(patientNum);
        diagnoses = db.prepare(`SELECT d.hadm_id, d.icd_code, diag.long_title FROM diagnoses_icd d LEFT JOIN d_icd_diagnoses diag ON d.icd_code = diag.icd_code WHERE d.subject_id = ? ORDER BY d.hadm_id`).all(patientNum);
        prescriptions = db.prepare(`SELECT hadm_id, drug, dose_val_rx, dose_unit_rx, route, doses_per_24_hrs FROM prescriptions WHERE subject_id = ? ORDER BY hadm_id`).all(patientNum);
        labevents = db.prepare(`SELECT l.hadm_id, l.charttime, l.valuenum, l.valueuom, item.label FROM labevents l LEFT JOIN d_labitems item ON l.itemid = item.itemid WHERE l.subject_id = ? ORDER BY l.charttime ASC`).all(patientNum);
        icustays = db.prepare(`SELECT hadm_id, intime, outtime, first_careunit FROM icustays WHERE subject_id = ? ORDER BY intime ASC`).all(patientNum);
      } else {
        patient = db.prepare(`SELECT patient_id, full_name, date_of_birth, gender FROM patient_registry WHERE patient_id = ?`).get(patientId);
        if (!patient) {
          return new Response(JSON.stringify({ success: false, error: `Patient ${patientId} not found` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        isClaraPatient = true;
      }

      // Format clinical data for LLM
      let formatted = '';
      if (isClaraPatient) {
        formatted = `CLARA Patient: ${patient.full_name}\nID: ${patient.patient_id}\nDOB: ${patient.date_of_birth}\nGender: ${patient.gender}\n\nNote: This patient was registered manually and has no longitudinal clinical history in the system yet.`;
      } else {
        formatted = `MIMIC Patient: ${patient.subject_id}\nGender: ${patient.gender}\nAge: ${patient.anchor_age}\n\n=== ADMISSIONS ===\n`;
        admissions.forEach((adm, idx) => {
          formatted += `\nAdmission ${idx + 1}: ${adm.admittime} to ${adm.dischtime}\n`;
          const admDiags = diagnoses.filter(d => d.hadm_id === adm.hadm_id);
          if (admDiags.length > 0) {
            formatted += `Diagnoses: ${admDiags.map(d => d.long_title).join('; ')}\n`;
          }
          const admPrescr = prescriptions.filter(p => p.hadm_id === adm.hadm_id);
          if (admPrescr.length > 0) {
            formatted += `Medications: ${admPrescr.slice(0, 5).map(p => `${p.drug} ${p.dose_val_rx || 'dose not specified'} ${p.dose_unit_rx || ''}`).join('; ')}\n`;
          }
          const admLabs = labevents.filter(l => l.hadm_id === adm.hadm_id);
          if (admLabs.length > 0) {
            formatted += `Labs: ${admLabs.slice(0, 3).map(l => `${l.label}: ${l.valuenum} ${l.valueuom}`).join('; ')}\n`;
          }
        });
        if (admissions.length > 1) {
          formatted += `\n=== SUMMARY ===\nTotal admissions: ${admissions.length}\nTotal diagnoses: ${diagnoses.length}\nTotal medications: ${prescriptions.length}\nTotal lab events: ${labevents.length}\n`;
        }
      }

      // Get Gemini API key
      const apiKey = process.env.GEMINI_API_KEY || '';

      // Generate response
      const llmResponse = await callGeminiAPI(formatted, question, apiKey);

      return new Response(
        JSON.stringify({
          success: true,
          patientId,
          question,
          ...llmResponse
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('[PATIENT_CHAT] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS(request) {
  return new Response(null, { status: 200, headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' } });
}
