/**
 * Patient Search API
 * GET /api/patients/search?type=id&value=<id> or
 * GET /api/patients/search?type=phone&value=<phone>
 */

/**
 * Normalize phone number for consistent comparison
 * Removes all non-digit characters
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const normalized = String(phone).replace(/\D/g, '');
  return normalized.length >= 10 ? normalized : null;
}

/**
 * Validate patient ID (positive integer)
 */
function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

export async function GET(request) {
  const { runQuery, verifyAuth } = await import('../../../../../backend/database/connection.js');
  
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          hint: 'Please log in to access patient search'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const searchType = searchParams.get('type')?.toLowerCase();
    const searchValue = searchParams.get('value')?.trim();

    // Input validation
    if (!searchType || !searchValue) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required parameters',
          hint: 'Provide type (id or phone) and value'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let query;
    let params = [];

    if (searchType === 'id') {
      // Search by patient ID
      const patientId = validatePatientId(searchValue);
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

      // Determine if ID is MIMIC (10M+) or new patient (1-9,999,999)
      if (patientId >= 10000000) {
        // MIMIC patient
        query = `
          SELECT 
            subject_id as patient_id,
            'MIMIC' as source,
            gender,
            anchor_age as age,
            anchor_year,
            anchor_year_group,
            dod,
            created_at
          FROM patients
          WHERE subject_id = ?
        `;
      } else {
        // New patient (MANUAL or IMPORT)
        query = `
          SELECT 
            patient_id,
            patient_source as source,
            gender,
            NULL as age,
            NULL as anchor_year,
            NULL as anchor_year_group,
            NULL as dod,
            created_at,
            full_name,
            date_of_birth
          FROM patient_registry
          WHERE patient_id = ?
        `;
      }
      params = [patientId];
    } else if (searchType === 'phone') {
      // Search by phone number
      // Note: Phone field does not exist in current schema
      // This endpoint is prepared for future use when phone field is added
      const normalizedPhone = normalizePhoneNumber(searchValue);
      if (!normalizedPhone) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid phone number',
            hint: 'Phone number must contain at least 10 digits'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if phone field exists in patients table
      query = `
        SELECT 
          subject_id,
          gender,
          anchor_age,
          anchor_year,
          anchor_year_group,
          dod,
          created_at
        FROM patients
        WHERE phone_number = ?
      `;
      params = [normalizedPhone];
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid search type',
          hint: 'Use type=id or type=phone'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute query with parameterized statement
    const result = runQuery(query, params);

    if (!result.success) {
      // If phone field doesn't exist, provide helpful message
      if (searchType === 'phone' && result.error?.includes('no such column')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Phone search not yet available',
            hint: 'Search by patient ID instead. Phone field has not been configured.'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: result.error
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (result.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          found: false,
          message: `No patient found matching ${searchType}: ${searchValue}`,
          data: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const patient = result.data[0];
    
    // Build response based on patient source
    let patientResponse = {
      id: patient.patient_id,
      source: patient.source,
      gender: patient.gender === 'f' ? 'Female' : patient.gender === 'm' ? 'Male' : (patient.gender || 'Not specified'),
    };
    
    if (patient.source === 'MIMIC') {
      // MIMIC patient
      patientResponse.age = patient.age;
      patientResponse.yearGroup = patient.anchor_year_group;
      patientResponse.dateOfDeath = patient.dod;
    } else {
      // New patient (MANUAL or IMPORT)
      patientResponse.fullName = patient.full_name;
      if (patient.date_of_birth) {
        const dob = new Date(patient.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        patientResponse.age = age;
        patientResponse.dateOfBirth = patient.date_of_birth;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        patient: patientResponse
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Patient search error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Server error during patient search'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
