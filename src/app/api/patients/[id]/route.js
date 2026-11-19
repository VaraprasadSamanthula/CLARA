/**
 * Patient Profile API
 * GET /api/patients/[id]
 * 
 * Returns comprehensive patient information:
 * - MIMIC patients (ID >= 10,000,000): demographics + clinical data (admissions, diagnoses, etc.)
 * - New patients (ID 1-9,999,999): demographics only (manual/import registration)
 */

function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * Determine if a patient ID is MIMIC or new patient
 * MIMIC: >= 10,000,000
 * New (MANUAL/IMPORT): 1-9,999,999
 */
function isPatientMimic(patientId) {
  return patientId >= 10000000;
}

/**
 * Get patient info from MIMIC patients table
 */
async function getMimicPatientInfo(patientId, runQuery) {
  const query = `
    SELECT 
      subject_id,
      gender,
      anchor_age,
      anchor_year,
      anchor_year_group,
      dod
    FROM patients
    WHERE subject_id = ?
  `;
  
  const result = runQuery(query, [patientId]);
  if (!result.success || result.data.length === 0) {
    return null;
  }
  
  const p = result.data[0];
  return {
    id: p.subject_id,
    source: 'MIMIC',
    gender: p.gender === 'f' ? 'Female' : p.gender === 'm' ? 'Male' : p.gender,
    age: p.anchor_age,
    yearGroup: p.anchor_year_group,
    dateOfDeath: p.dod
  };
}

/**
 * Get patient info from patient_registry (new patients)
 */
async function getRegistryPatientInfo(patientId, runQuery) {
  const query = `
    SELECT 
      patient_id,
      patient_source,
      full_name,
      gender,
      date_of_birth,
      phone,
      email
    FROM patient_registry
    WHERE patient_id = ?
  `;
  
  const result = runQuery(query, [patientId]);
  if (!result.success || result.data.length === 0) {
    return null;
  }
  
  const p = result.data[0];
  
  // Calculate age from date of birth
  let age = null;
  if (p.date_of_birth) {
    const dob = new Date(p.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }
  
  return {
    id: p.patient_id,
    source: p.patient_source,
    fullName: p.full_name,
    gender: p.gender === 'f' ? 'Female' : p.gender === 'm' ? 'Male' : (p.gender || 'Not specified'),
    age: age,
    dateOfBirth: p.date_of_birth,
    phone: p.phone,
    email: p.email
  };
}

/**
 * Get MIMIC admissions (only for MIMIC patients)
 */
async function getAdmissions(patientId, runQuery) {
  const query = `
    SELECT 
      hadm_id,
      admittime,
      dischtime,
      admission_type,
      admission_location,
      discharge_location,
      insurance,
      hospital_expire_flag
    FROM admissions
    WHERE subject_id = ?
    ORDER BY admittime DESC
  `;
  
  const result = runQuery(query, [patientId]);
  return result.success ? result.data : [];
}

async function getDiagnoses(patientId, runQuery) {
  const query = `
    SELECT 
      d.seq_num,
      d.icd_code,
      d.icd_version,
      ref.long_title
    FROM diagnoses_icd d
    LEFT JOIN d_icd_diagnoses ref ON d.icd_code = ref.icd_code AND d.icd_version = ref.icd_version
    WHERE d.subject_id = ?
    ORDER BY d.seq_num
  `;
  
  const result = runQuery(query, [patientId]);
  return result.success ? result.data : [];
}

async function getPrescriptions(patientId, runQuery) {
  const query = `
    SELECT 
      prescription_id,
      drug,
      starttime,
      stoptime,
      dose_val_rx,
      dose_unit_rx,
      route,
      prod_strength
    FROM prescriptions
    WHERE subject_id = ?
    ORDER BY starttime DESC
    LIMIT 50
  `;
  
  const result = runQuery(query, [patientId]);
  return result.success ? result.data : [];
}

async function getLabResults(patientId, runQuery) {
  const query = `
    SELECT 
      l.labevent_id,
      l.charttime,
      d.label as test_name,
      l.value,
      l.valuenum,
      l.valueuom,
      l.ref_range_lower,
      l.ref_range_upper,
      l.flag
    FROM labevents l
    LEFT JOIN d_labitems d ON l.itemid = d.itemid
    WHERE l.subject_id = ?
    ORDER BY l.charttime DESC
    LIMIT 100
  `;
  
  const result = runQuery(query, [patientId]);
  return result.success ? result.data : [];
}

async function getICUStays(patientId, runQuery) {
  const query = `
    SELECT 
      stay_id,
      intime,
      outtime,
      first_careunit,
      last_careunit,
      los
    FROM icustays
    WHERE subject_id = ?
    ORDER BY intime DESC
  `;
  
  const result = runQuery(query, [patientId]);
  return result.success ? result.data : [];
}

export async function GET(request, { params }) {
  // Import at handler level to ensure availability
  const { runQuery, verifyAuth } = await import('../../../../../backend/database/connection.js');
  
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          hint: 'Please log in to access patient profiles'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // params is a Promise in Next.js 16 - must await
    const resolvedParams = await params;
    const patientId = validatePatientId(resolvedParams.id);
    
    if (!patientId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid patient ID',
          hint: 'Patient ID must be a positive integer'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine if MIMIC or new patient based on ID range
    const isMimic = isPatientMimic(patientId);
    let patient;
    
    if (isMimic) {
      // MIMIC patient - fetch from patients table
      patient = await getMimicPatientInfo(patientId, runQuery);
    } else {
      // New patient (MANUAL or IMPORT) - fetch from patient_registry
      patient = await getRegistryPatientInfo(patientId, runQuery);
    }
    
    if (!patient) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Patient ${patientId} not found`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For MIMIC patients, fetch clinical data
    let clinical = null;
    if (isMimic) {
      const [admissions, diagnoses, prescriptions, labResults, icuStays] = await Promise.all([
        getAdmissions(patientId, runQuery),
        getDiagnoses(patientId, runQuery),
        getPrescriptions(patientId, runQuery),
        getLabResults(patientId, runQuery),
        getICUStays(patientId, runQuery)
      ]);

      clinical = {
        admissions: {
          count: admissions.length,
          records: admissions
        },
        diagnoses: {
          count: diagnoses.length,
          records: diagnoses
        },
        prescriptions: {
          count: prescriptions.length,
          records: prescriptions
        },
        labResults: {
          count: labResults.length,
          records: labResults
        },
        icuStays: {
          count: icuStays.length,
          records: icuStays
        }
      };
    } else {
      // For CLARA patients, fetch from CLARA tables
      const claraMeds = runQuery(
        'SELECT * FROM clara_medications WHERE patient_id = ? ORDER BY start_date DESC',
        [patientId]
      );
      
      const claraDiags = runQuery(
        'SELECT * FROM clara_diagnoses WHERE patient_id = ? ORDER BY diagnosis_date DESC',
        [patientId]
      );

      clinical = {
        medications: {
          count: claraMeds.success ? claraMeds.data.length : 0,
          records: claraMeds.success ? claraMeds.data : []
        },
        diagnoses: {
          count: claraDiags.success ? claraDiags.data.length : 0,
          records: claraDiags.success ? claraDiags.data : []
        }
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        patient,
        clinical
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Patient profile error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error fetching patient profile'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
