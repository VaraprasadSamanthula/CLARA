/**
 * POST /api/patient-chat
 * Patient-specific chatbot with intent-driven clinical data retrieval
 * 
 * PHASE 4: Intent Recognition
 * - Detects doctor's question intent (medications, labs, diagnoses, etc.)
 * - Retrieves ONLY relevant clinical data
 * - Sends focused context to Gemini for concise, targeted responses
 */

import { verifyAuth, initializeDb, getDb } from '../../../../backend/database/connection.js';

/**
 * PHASE 4: Intent Recognition
 * Identifies what information the doctor is actually asking for
 * 
 * Supported intents:
 * 1. medications - Prescription details
 * 2. labs - Laboratory results and values
 * 3. diagnoses - Recorded diagnoses and ICD codes
 * 4. admissions - Hospital admission history
 * 5. icu - ICU stays and intensive care history
 * 6. treatment - Procedures and treatments
 * 7. timeline - Clinical timeline and progression
 * 8. demographics - Patient demographics and basic info
 * 9. complete - Full patient summary
 * 10. followup - Follow-up context from previous message
 */
function detectIntent(question) {
  const q = question.toLowerCase();
  
  // Keywords mapped to intents
  // Note: Removed 'medical history' from diagnoses to avoid overlap with 'complete' summaries
  const patterns = {
    complete: {
      keywords: ['summary', 'overall', 'complete', 'full history', 'everything', 'all of it', 'comprehensive', 'complete picture', 'entire'],
      score: 0
    },
    treatment: {
      keywords: ['treatment', 'procedure', 'intervention', 'surgery', 'surgic', 'operation', 'therapy', 'what was done'],
      score: 0
    },
    medications: {
      keywords: ['medicin', 'drug', 'prescription', 'pharma', 'dosage', 'dose', 'pills', 'tablet', 'given', 'prescribed', 'taking', 'what did they give', 'what was prescribed'],
      score: 0
    },
    labs: {
      keywords: ['lab', 'test', 'result', 'value', 'abnormal', 'high', 'low', 'blood', 'glucose', 'hemoglobin', 'potassium', 'sodium', 'creatinine', 'measurement', 'finding'],
      score: 0
    },
    diagnoses: {
      keywords: ['diagnos', 'condition', 'disease', 'illness', 'what does', 'icd', 'what was wrong', 'what was the diagnosis'],
      score: 0
    },
    admissions: {
      keywords: ['admission', 'admit', 'hospitali', 'encounter', 'visit', 'when was', 'how many times', 'how long', 'discharge'],
      score: 0
    },
    icu: {
      keywords: ['icu', 'intensive care', 'critical', 'vent', 'ventilator', 'intubat', 'sedation'],
      score: 0
    },
    timeline: {
      keywords: ['when', 'timeline', 'progression', 'worsening', 'improving', 'trend', 'evolv', 'over time', 'chronolog', 'sequence', 'order'],
      score: 0
    },
    demographics: {
      keywords: ['age', 'gender', 'sex', 'male', 'female', 'background', 'personal', 'demo'],
      score: 0
    }
  };
  
  // Score each intent
  for (const [intent, data] of Object.entries(patterns)) {
    for (const keyword of data.keywords) {
      if (q.includes(keyword)) {
        patterns[intent].score++;
      }
    }
  }
  
  // Find highest scoring intent
  let topIntent = 'complete'; // default
  let topScore = 0;
  
  for (const [intent, data] of Object.entries(patterns)) {
    if (data.score > topScore) {
      topScore = data.score;
      topIntent = intent;
    }
  }
  
  console.log(`[INTENT] Detected: ${topIntent} (score: ${topScore})`);
  return topIntent;
}

/**
 * PHASE 4: Intent-Specific Data Retrieval
 * Retrieves only the clinically relevant data for the detected intent
 */
function retrieveIntentData(db, patientNum, intent, allData) {
  const { admissions, diagnoses, prescriptions, labevents, icustays } = allData;
  
  switch (intent) {
    case 'medications':
      return {
        type: 'medications',
        data: formatMedicationData(prescriptions),
        summary: `Found ${prescriptions.length} medication records`
      };
    
    case 'labs':
      return {
        type: 'labs',
        data: formatLabData(labevents, allData),
        summary: `Found ${labevents.length} laboratory test results`
      };
    
    case 'diagnoses':
      return {
        type: 'diagnoses',
        data: formatDiagnosisData(diagnoses, allData),
        summary: `Found ${diagnoses.length} diagnostic records`
      };
    
    case 'admissions':
      return {
        type: 'admissions',
        data: formatAdmissionData(admissions, diagnoses),
        summary: `Found ${admissions.length} hospital admissions`
      };
    
    case 'icu':
      return {
        type: 'icu',
        data: formatICUData(icustays, admissions),
        summary: `Found ${icustays.length} ICU stays`
      };
    
    case 'treatment':
      // Treatments are typically implied by admission context
      return {
        type: 'treatment',
        data: formatTreatmentData(admissions, prescriptions, icustays),
        summary: `Treatment information from ${admissions.length} admissions`
      };
    
    case 'timeline':
      return {
        type: 'timeline',
        data: formatTimelineData(admissions, diagnoses, prescriptions, labevents),
        summary: `Clinical timeline across ${admissions.length} admissions`
      };
    
    case 'demographics':
      return {
        type: 'demographics',
        data: formatDemographicsData(allData.patient),
        summary: 'Patient demographics and background'
      };
    
    case 'complete':
    case 'followup':
    default:
      return {
        type: 'complete',
        data: formatCompleteData(allData),
        summary: 'Complete patient clinical summary'
      };
  }
}

// Format medications for response
function formatMedicationData(prescriptions) {
  if (prescriptions.length === 0) return 'No medication records found.';
  
  const grouped = {};
  prescriptions.forEach(p => {
    if (!grouped[p.hadm_id]) grouped[p.hadm_id] = [];
    grouped[p.hadm_id].push(p);
  });
  
  let text = '## Medications\n\n';
  for (const [hadmId, meds] of Object.entries(grouped)) {
    text += `### Admission ${hadmId}\n`;
    meds.forEach(m => {
      const dose = m.dose_val_rx ? `${m.dose_val_rx}${m.dose_unit_rx || ''}` : 'dose not specified';
      const route = m.route ? ` (${m.route})` : '';
      const freq = m.doses_per_24_hrs ? ` - ${m.doses_per_24_hrs} times daily` : '';
      text += `- **${m.drug}**: ${dose}${route}${freq}\n`;
    });
  }
  
  return text;
}

// Format labs for response
function formatLabData(labevents, allData) {
  if (labevents.length === 0) return 'No laboratory test results found.';
  
  const grouped = {};
  labevents.forEach(l => {
    if (!grouped[l.hadm_id]) grouped[l.hadm_id] = [];
    grouped[l.hadm_id].push(l);
  });
  
  let text = '## Laboratory Results\n\n';
  for (const [hadmId, labs] of Object.entries(grouped)) {
    text += `### Admission ${hadmId}\n`;
    labs.slice(0, 10).forEach(l => {
      const val = l.valuenum !== null ? `${l.valuenum}` : 'N/A';
      const unit = l.valueuom ? ` ${l.valueuom}` : '';
      const date = l.charttime ? ` (${l.charttime.substring(0, 10)})` : '';
      text += `- **${l.label || `Item ${l.itemid}`}**: ${val}${unit}${date}\n`;
    });
    if (labs.length > 10) {
      text += `- ... and ${labs.length - 10} more test results\n`;
    }
  }
  
  return text;
}

// Format diagnoses for response
function formatDiagnosisData(diagnoses, allData) {
  if (diagnoses.length === 0) return 'No diagnostic records found.';
  
  const grouped = {};
  diagnoses.forEach(d => {
    if (!grouped[d.hadm_id]) grouped[d.hadm_id] = [];
    grouped[d.hadm_id].push(d);
  });
  
  let text = '## Diagnoses\n\n';
  for (const [hadmId, diags] of Object.entries(grouped)) {
    text += `### Admission ${hadmId}\n`;
    diags.forEach(d => {
      const title = d.long_title || 'Unknown diagnosis';
      text += `- **${d.icd_code}**: ${title}\n`;
    });
  }
  
  return text;
}

// Format admissions for response
function formatAdmissionData(admissions, diagnoses) {
  if (admissions.length === 0) return 'No admission records found.';
  
  let text = `## Admission History (${admissions.length} total)\n\n`;
  admissions.forEach((adm, idx) => {
    const admit = adm.admittime ? adm.admittime.substring(0, 10) : 'N/A';
    const discharge = adm.dischtime ? adm.dischtime.substring(0, 10) : 'N/A';
    const type = adm.admission_type || 'Unknown';
    text += `### Admission ${idx + 1}: ${admit} to ${discharge}\n`;
    text += `- **Type**: ${type}\n`;
    text += `- **Location**: ${adm.admission_location || 'N/A'} → ${adm.discharge_location || 'N/A'}\n`;
    text += `- **Outcome**: ${adm.hospital_expire_flag === 1 ? 'Died' : 'Discharged'}\n`;
    
    const admDiags = diagnoses.filter(d => d.hadm_id === adm.hadm_id);
    if (admDiags.length > 0) {
      text += `- **Diagnoses**: ${admDiags.map(d => d.long_title || d.icd_code).join(', ')}\n`;
    }
  });
  
  return text;
}

// Format ICU for response
function formatICUData(icustays, admissions) {
  if (icustays.length === 0) return 'No ICU stay records found.';
  
  let text = `## ICU Stays (${icustays.length} total)\n\n`;
  icustays.forEach((stay, idx) => {
    const inTime = stay.intime ? stay.intime.substring(0, 10) : 'N/A';
    const outTime = stay.outtime ? stay.outtime.substring(0, 10) : 'N/A';
    const admission = admissions.find(a => a.hadm_id === stay.hadm_id);
    
    text += `### ICU Stay ${idx + 1}\n`;
    text += `- **In**: ${inTime}\n`;
    text += `- **Out**: ${outTime}\n`;
    text += `- **Unit**: ${stay.first_careunit || 'Unknown'}\n`;
    if (admission) {
      text += `- **Admission**: ${admission.admission_type}\n`;
    }
  });
  
  return text;
}

// Format treatments (derived from admissions and procedures)
function formatTreatmentData(admissions, prescriptions, icustays) {
  let text = '## Treatments and Interventions\n\n';
  
  text += `### Hospital Interventions (${admissions.length} admissions)\n`;
  admissions.forEach((adm, idx) => {
    text += `- **Admission ${idx + 1}** (${adm.admittime?.substring(0, 10)}): ${adm.admission_type}\n`;
  });
  
  text += `\n### Medications Administered (${prescriptions.length} records)\n`;
  const uniqueDrugs = [...new Set(prescriptions.map(p => p.drug))];
  uniqueDrugs.slice(0, 10).forEach(drug => {
    text += `- ${drug}\n`;
  });
  
  if (icustays.length > 0) {
    text += `\n### Critical Care (${icustays.length} ICU stays)\n`;
    icustays.forEach((stay, idx) => {
      text += `- ICU Stay ${idx + 1}: ${stay.first_careunit}\n`;
    });
  }
  
  return text;
}

// Format clinical timeline
function formatTimelineData(admissions, diagnoses, prescriptions, labevents) {
  let text = '## Clinical Timeline\n\n';
  
  admissions.forEach((adm, idx) => {
    const admit = adm.admittime ? new Date(adm.admittime) : null;
    const discharge = adm.dischtime ? new Date(adm.dischtime) : null;
    
    text += `### Admission ${idx + 1}: ${adm.admittime?.substring(0, 10) || 'N/A'}\n`;
    text += `- **Type**: ${adm.admission_type}\n`;
    
    const admDiags = diagnoses.filter(d => d.hadm_id === adm.hadm_id);
    if (admDiags.length > 0) {
      text += `- **Problems**: ${admDiags.slice(0, 3).map(d => d.long_title || d.icd_code).join(', ')}\n`;
    }
    
    const admLabs = labevents.filter(l => l.hadm_id === adm.hadm_id);
    if (admLabs.length > 0) {
      text += `- **Tests**: ${admLabs.length} measurements\n`;
    }
    
    const admMeds = prescriptions.filter(p => p.hadm_id === adm.hadm_id);
    if (admMeds.length > 0) {
      text += `- **Medications**: ${admMeds.length} prescriptions\n`;
    }
    
    if (discharge) {
      text += `- **Discharged**: ${adm.dischtime?.substring(0, 10)}\n`;
    }
    text += '\n';
  });
  
  return text;
}

// Format demographics
function formatDemographicsData(patient) {
  let text = '## Patient Demographics\n\n';
  text += `- **Subject ID**: ${patient.subject_id}\n`;
  text += `- **Gender**: ${patient.gender === 'm' ? 'Male' : patient.gender === 'f' ? 'Female' : 'Unknown'}\n`;
  text += `- **Age at Anchor**: ${patient.anchor_age}\n`;
  text += `- **Anchor Year**: ${patient.anchor_year}\n`;
  if (patient.dod) {
    text += `- **Date of Death**: ${patient.dod}\n`;
  } else {
    text += `- **Status**: Living (as of dataset)\n`;
  }
  
  return text;
}

// Format complete patient data
function formatCompleteData(allData) {
  const { patient, admissions, diagnoses, prescriptions, labevents, icustays } = allData;
  
  let text = '## Complete Patient Summary\n\n';
  text += `### Demographics\n`;
  text += `- **ID**: ${patient.subject_id}\n`;
  text += `- **Gender**: ${patient.gender === 'm' ? 'Male' : patient.gender === 'f' ? 'Female' : 'Unknown'}\n`;
  text += `- **Age**: ${patient.anchor_age}\n`;
  text += `- **Year**: ${patient.anchor_year}\n\n`;
  
  text += `### Clinical Summary\n`;
  text += `- **Admissions**: ${admissions.length}\n`;
  text += `- **Diagnoses**: ${diagnoses.length}\n`;
  text += `- **Medications**: ${prescriptions.length}\n`;
  text += `- **Lab Tests**: ${labevents.length}\n`;
  text += `- **ICU Stays**: ${icustays.length}\n\n`;
  
  text += `### Recent Activity\n`;
  if (admissions.length > 0) {
    const lastAdm = admissions[admissions.length - 1];
    text += `- **Last Admission**: ${lastAdm.admittime?.substring(0, 10)}\n`;
    text += `- **Type**: ${lastAdm.admission_type}\n`;
  }
  
  return text;
}

async function callGeminiAPI(clinicalDataStr, question, intent, apiKey) {
  if (!apiKey) {
    return {
      success: true,
      source: 'sql',
      answer: clinicalDataStr,
      note: 'Structured clinical summary. For natural-language responses, configure Gemini API key.',
      intent: intent
    };
  }

  try {
    // Use gemini-3.5-flash-lite (currently supported model)
    const model = 'gemini-3.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Craft intent-specific prompt
    const intentPrompts = {
      medications: 'Focus specifically on medication names, dosages, routes, and frequencies.',
      labs: 'Focus specifically on laboratory test names, values, units, and abnormal findings.',
      diagnoses: 'Focus specifically on diagnoses, ICD codes, and recorded medical conditions.',
      admissions: 'Focus specifically on admission dates, types, locations, and outcomes.',
      icu: 'Focus specifically on ICU/intensive care history, units, and durations.',
      treatment: 'Focus specifically on treatments, procedures, and interventions.',
      timeline: 'Organize information chronologically to show progression over time.',
      demographics: 'Focus on patient background, age, gender, and basic characteristics.',
      complete: 'Provide a comprehensive overview of the patient\'s clinical history.',
      followup: 'Answer the follow-up question using the context of the patient\'s history.'
    };
    
    const intentFocus = intentPrompts[intent] || intentPrompts.complete;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `You are a clinical data assistant helping clinicians understand their patient's medical history.

PATIENT CLINICAL DATA (${intent} focused):
${clinicalDataStr}

DOCTOR'S QUESTION:
${question}

RESPONSE GUIDELINES:
1. Answer the question directly and specifically for this patient.
2. ${intentFocus}
3. Use ONLY the clinical data provided above—do not invent information.
4. Include specific dates, values, lab results, and medication names from the records.
5. Use markdown formatting for readability:
   - Use **bold** for important findings or abnormal values
   - Use bullet points (-) to list items
   - Use headings to organize information
6. If specific information is unavailable, state "No data available for [specific item]"
7. Do not diagnose, recommend treatments, or provide medical advice—only summarize data
8. Keep responses concise and focused; aim for 100-300 words unless a comprehensive summary is requested
9. Distinguish between current and historical information
10. Be direct and avoid unnecessary elaboration`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
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
      model: model,
      intent: intent
    };
  } catch (error) {
    console.error('[GEMINI] Error:', error.message);
    return {
      success: true,
      source: 'sql',
      answer: clinicalDataStr,
      error: error.message,
      note: 'Natural-language generation unavailable. Returning structured clinical summary instead.',
      intent: intent
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

      console.log(`[PATIENT_CHAT] Patient: ${patientId}, Question: ${question.substring(0, 50)}`);

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
        
        // Get CLARA medications and diagnoses
        prescriptions = db.prepare(`SELECT medication_name, dosage, route, frequency, start_date, end_date, status FROM clara_medications WHERE patient_id = ? ORDER BY start_date DESC`).all(patientId);
        diagnoses = db.prepare(`SELECT diagnosis_name, description, diagnosis_date, status FROM clara_diagnoses WHERE patient_id = ? ORDER BY diagnosis_date DESC`).all(patientId);
      }

      // PHASE 4: Detect question intent
      let intent = 'complete';
      let formatted = '';
      
      if (isClaraPatient) {
        intent = detectIntent(question);
        
        // Format CLARA patient data
        let claraMedicationsStr = '';
        if (prescriptions.length > 0) {
          claraMedicationsStr = '## Medications\n\n';
          prescriptions.forEach(m => {
            const dose = m.dosage ? `${m.dosage}` : 'dose not specified';
            const route = m.route ? ` (${m.route})` : '';
            const freq = m.frequency ? ` - ${m.frequency}` : '';
            const dates = m.start_date ? ` starting ${m.start_date}` : '';
            claraMedicationsStr += `- **${m.medication_name}**: ${dose}${route}${freq}${dates} (${m.status || 'unknown'})\n`;
          });
        } else {
          claraMedicationsStr = '## Medications\nNo medication records have been entered for this patient.\n\n';
        }
        
        let claraDiagnosesStr = '';
        if (diagnoses.length > 0) {
          claraDiagnosesStr = '## Diagnoses\n\n';
          diagnoses.forEach(d => {
            const desc = d.description ? ` - ${d.description}` : '';
            claraDiagnosesStr += `- **${d.diagnosis_name}**${desc} (diagnosed ${d.diagnosis_date}, ${d.status || 'unknown'})\n`;
          });
        } else {
          claraDiagnosesStr = '## Diagnoses\nNo diagnosis records have been entered for this patient.\n\n';
        }
        
        formatted = `**CLARA Patient**: ${patient.full_name}\n**ID**: ${patient.patient_id}\n**DOB**: ${patient.date_of_birth}\n**Gender**: ${patient.gender}\n\n${claraMedicationsStr}\n${claraDiagnosesStr}`;
      } else {
        // PHASE 4: Detect intent FIRST
        intent = detectIntent(question);
        console.log(`[PHASE 4] Detected intent: ${intent}`);
        
        // PHASE 4: Retrieve only intent-specific data
        const allData = {
          patient,
          admissions,
          diagnoses,
          prescriptions,
          labevents,
          icustays
        };
        
        const intentData = retrieveIntentData(db, patientNum, intent, allData);
        formatted = intentData.data;
        
        console.log(`[PHASE 4] Intent: ${intentData.type}, Summary: ${intentData.summary}`);
      }

      // Get Gemini API key
      const apiKey = process.env.GEMINI_API_KEY || '';

      // PHASE 4: Pass intent to Gemini
      const llmResponse = await callGeminiAPI(formatted, question, intent, apiKey);

      return new Response(
        JSON.stringify({
          success: true,
          patientId,
          question,
          intent,
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
