/**
 * POST /api/patient-chat
 * Patient-specific chatbot with longitudinal clinical history
 */

import { verifyAuth, initializeDb, getDb } from '../../../../backend/database/connection.js';

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
    // Use gemini-3.5-flash-lite (currently supported model)
    const model = 'gemini-3.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `You are a clinical data assistant helping clinicians understand their patient's medical history.

PATIENT CLINICAL DATA:
${clinicalDataStr}

DOCTOR'S QUESTION:
${question}

RESPONSE GUIDELINES:
1. Answer the question directly and specifically for this patient.
2. Use ONLY the clinical data provided above—do not invent information.
3. Include specific dates, values, lab results, and medication names from the records.
4. Use markdown formatting for readability:
   - Use **bold** for important findings or abnormal values
   - Use bullet points (-) to list diagnoses, medications, or lab results
   - Use headings (## Admission 1) to organize information chronologically
   - Use code blocks (\`\`\`) for structured data like lab tables
5. When organizing data:
   - Arrange admissions chronologically from earliest to latest
   - Group medications and lab results by admission when relevant
   - Highlight trends (improving/worsening) if multiple admissions exist
6. If specific information is unavailable, state "No data available for [specific item]"
7. For new CLARA patients with no history, explain the patient registration status
8. Use professional medical terminology but explain findings clearly
9. Do not diagnose, recommend treatments, or provide medical advice—only summarize data
10. Keep responses concise but complete; aim for 150-500 words depending on data volume`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          topP: 0.95,
          topK: 40
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI] API Error:', response.status, errorText.substring(0, 200));
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GEMINI] JSON Parse Error');
      throw new Error(`Failed to parse Gemini response`);
    }
    
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!answer) {
      throw new Error('No response content from Gemini');
    }

    return {
      success: true,
      source: 'gemini',
      answer: answer,
      model: model
    };
  } catch (error) {
    console.error('[GEMINI] Error:', error.message);
    return {
      success: true,
      source: 'sql',
      answer: clinicalDataStr,
      error: error.message,
      note: 'Natural-language generation unavailable. Returning structured clinical summary instead.'
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

    // Initialize database
    const dbInitialized = initializeDb();
    if (!dbInitialized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get database connection
    const db = getDb();
    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      db.pragma('foreign_keys = ON');
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

    } catch (error) {
      console.error('[PATIENT_CHAT] Error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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
