const queryCache = new Map();
const MAX_CACHE_SIZE = 50;

// Helper: Detect gender context in message
function detectGenderContext(msg) {
  // Use word boundaries to avoid substring collisions
  // "many" contains "man", "female" contains "male", etc.
  const hasFemale = /\b(female|woman|women)\b/.test(msg);
  const hasMale = /\b(male|man|men)\b/.test(msg);
  const hasPatientContext = msg.includes('patient') || msg.includes('find') || msg.includes('show') || msg.includes('list');
  
  // Check for explicit comparison: both mentioned without "only"/"just" one
  const comparingBoth = (hasFemale && hasMale) && (msg.includes('both') || msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ') || (msg.includes('and') && !msg.match(/only.*female|only.*male|just.*female|just.*male/)));
  
  if (comparingBoth) {
    return 'both'; // Gender breakdown/comparison query
  } else if (hasFemale && hasPatientContext) {
    return 'female';
  } else if (hasMale && hasPatientContext) {
    return 'male';
  }
  return null;
}

// Helper: Build WHERE conditions for patient queries
function buildPatientConditions(msg) {
  let conditions = [];
  
  // Gender detection
  const genderContext = detectGenderContext(msg);
  if (genderContext === 'female') {
    conditions.push("gender = 'f'");
    console.log('[CONDITION] Detected: Female patients');
  } else if (genderContext === 'male') {
    conditions.push("gender = 'm'");
    console.log('[CONDITION] Detected: Male patients');
  }
  
  // Age comparisons
  if (msg.includes('older than') || msg.includes('over ') || msg.includes('more than ')) {
    const match = msg.match(/(\d+)/);
    if (match) {
      const age = match[1];
      conditions.push(`anchor_age > ${age}`);
      console.log(`[CONDITION] Detected: Age > ${age}`);
    }
  } else if (msg.includes('younger than') || msg.includes('under ') || msg.includes('less than ')) {
    const match = msg.match(/(\d+)/);
    if (match) {
      const age = match[1];
      conditions.push(`anchor_age < ${age}`);
      console.log(`[CONDITION] Detected: Age < ${age}`);
    }
  } else if ((msg.includes('between') || msg.includes('aged')) && msg.includes('and')) {
    const nums = msg.match(/(\d+)/g);
    if (nums && nums.length >= 2) {
      conditions.push(`anchor_age >= ${nums[0]}`);
      conditions.push(`anchor_age <= ${nums[1]}`);
      console.log(`[CONDITION] Detected: Age between ${nums[0]} and ${nums[1]}`);
    }
  }
  
  return conditions;
}

// Generate SQL using intelligent pattern matching - NO GEMINI REQUIRED
// STEP 4 FIXES: Better gender detection, reordered patterns, expanded keywords
// STEP 5 FIXES: Improved intent detection for natural language variations
// PHASE 7.1 FIX: Explicit DML rejection before pattern matching
function generateSQLWithPatterns(userMessage) {
  const msg = userMessage.toLowerCase();
  
  console.log('[SQL GENERATION] Analyzing question:', msg);
  
  // PHASE 7.1: EXPLICIT DML REJECTION - Check FIRST before any pattern matching
  // Reject INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE
  const dmlKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate'];
  for (const keyword of dmlKeywords) {
    if (msg.includes(keyword)) {
      console.log(`[SECURITY] DML attempt detected: ${keyword}`);
      throw new Error(`Database modifications are not permitted. "${keyword}" statements are not allowed.`);
    }
  }
  
  // Detect query intent indicators
  let isCountQuery = msg.includes('how many') || msg.includes('total') || msg.includes('count');
  let isComparisonQuery = msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ');
  let isStatQuery = msg.includes('average') || msg.includes('mean') || msg.includes('minimum') || msg.includes('maximum') || msg.includes('min') || msg.includes('max');
  
  // PRIORITY 1: Schema/metadata queries - CHECK EARLY before patient queries
  if (msg.includes('schema') || msg.includes('table') || msg.includes('column') || msg.includes('database structure') || msg.includes('field')) {
    if (msg.includes('column') || msg.includes('field')) {
      return "PRAGMA table_info(patients)";
    }
    return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
  }
  
  // PRIORITY 2: Special case - gender breakdown (both male AND female) or comparison
  const genderContext = detectGenderContext(msg);
  if ((genderContext === 'both' && isCountQuery) || (isComparisonQuery && msg.includes('male') && msg.includes('female'))) {
    console.log('[SQL] Gender breakdown/comparison detected');
    return "SELECT 'male' as gender, COUNT(*) as count FROM patients WHERE gender = 'm' UNION SELECT 'female' as gender, COUNT(*) as count FROM patients WHERE gender = 'f'";
  }
  
  // PRIORITY 3: Age statistics - CHECK before PATIENT queries
  // This must come BEFORE patient queries because questions like "What is the average age of patients?" 
  // contain both "age" and "patient"
  // But must NOT trigger on ICU or other non-age statistics queries
  if (msg.includes('age') && !msg.includes('icu') && !msg.includes('stay') && !msg.includes('duration') && (isStatQuery || msg.includes('average') || msg.includes('mean') || msg.includes('distribution') || msg.includes('min') || msg.includes('max'))) {
    console.log('[SQL] Age statistics detected');
    if (msg.includes('average') || msg.includes('mean')) {
      return "SELECT AVG(anchor_age) as average_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
    }
    if (msg.includes('minimum') || msg.includes('maximum') || (msg.includes('min') && msg.includes('max'))) {
      return "SELECT MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
    }
    if (msg.includes('distribution')) {
      return "SELECT anchor_age, COUNT(*) as count FROM patients GROUP BY anchor_age ORDER BY anchor_age";
    }
    return "SELECT AVG(anchor_age) as average_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
  }
  
  // PRIORITY 4: Patient queries (with gender/age filters) - AFTER age statistics
  let conditions = [];
  if (msg.includes('patient') || msg.includes('find') || msg.includes('show ')) {
    conditions = buildPatientConditions(msg);
    
    if (isCountQuery) {
      if (conditions.length > 0) {
        const where = conditions.join(' AND ');
        return `SELECT COUNT(*) as count FROM patients WHERE ${where}`;
      }
      return "SELECT COUNT(*) as count FROM patients";
    } else {
      // PHASE 10 FIX: Detect if user is asking for ALL records vs. just examples
      // Keywords indicating complete-list requests: all, every, complete, list, ids, full
      const wantsAllRecords = msg.includes('all ') || msg.includes('every') || msg.includes('complete') || 
                              msg.includes('list ') || msg.includes(' ids') || msg.includes('full list') ||
                              msg.includes('show all') || msg.includes('give me all');
      
      if (wantsAllRecords) {
        // No LIMIT - return all matching records
        if (conditions.length > 0) {
          const where = conditions.join(' AND ');
          return `SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients WHERE ${where} ORDER BY subject_id`;
        }
        return "SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients ORDER BY subject_id";
      } else {
        // Limited results for general patient queries
        if (conditions.length > 0) {
          const where = conditions.join(' AND ');
          return `SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients WHERE ${where} LIMIT 20`;
        }
        return "SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients LIMIT 20";
      }
    }
  }
  
  // PRIORITY 3: Admission queries
  if (msg.includes('admission') || msg.includes('admitted') || msg.includes('admit')) {
    if (isCountQuery) {
      return "SELECT COUNT(*) as admission_count FROM admissions";
    }
    return "SELECT admission_type, COUNT(*) as count FROM admissions GROUP BY admission_type";
  }
  
  // PRIORITY 4: Diagnosis queries (check BEFORE medication to avoid overlap)
  if (msg.includes('diagnos') || msg.includes('condition') || msg.includes('icd')) {
    if (isCountQuery) {
      return "SELECT COUNT(*) as total_diagnoses FROM diagnoses_icd";
    }
    if (msg.includes('common') || msg.includes('most')) {
      return "SELECT icd_code, COUNT(*) as count FROM diagnoses_icd GROUP BY icd_code ORDER BY count DESC LIMIT 10";
    }
    if (msg.includes('description') || msg.includes('what does')) {
      return "SELECT di.icd_code, di.long_title, COUNT(DISTINCT d.subject_id) as patient_count FROM d_icd_diagnoses di LEFT JOIN diagnoses_icd d ON di.icd_code = d.icd_code GROUP BY di.icd_code ORDER BY patient_count DESC LIMIT 10";
    }
    return "SELECT icd_code, COUNT(*) as count FROM diagnoses_icd GROUP BY icd_code ORDER BY count DESC LIMIT 10";
  }
  
  // PRIORITY 5: Medication/Prescription queries (expanded keywords)
  if (msg.includes('medicin') || msg.includes('medication') || msg.includes('drug') || msg.includes('prescription') || msg.includes('pharma')) {
    if (isCountQuery) {
      return "SELECT COUNT(*) as total_prescriptions FROM prescriptions";
    }
    if (msg.includes('common') || msg.includes('most') || msg.includes('top')) {
      return "SELECT drug, COUNT(*) as count FROM prescriptions GROUP BY drug ORDER BY count DESC LIMIT 10";
    }
    return "SELECT drug, COUNT(*) as count FROM prescriptions GROUP BY drug ORDER BY count DESC LIMIT 10";
  }
  
  // PRIORITY 6: Lab queries
  if (msg.includes('lab') || msg.includes('test') || msg.includes('measurement')) {
    if (isCountQuery) {
      return "SELECT COUNT(*) as total_tests FROM labevents";
    }
    if (msg.includes('description') || msg.includes('category')) {
      return "SELECT l.itemid, d.label, d.fluid, COUNT(*) as measurement_count FROM labevents l JOIN d_labitems d ON l.itemid = d.itemid GROUP BY l.itemid, d.label ORDER BY measurement_count DESC LIMIT 10";
    }
    return "SELECT itemid, COUNT(*) as measurement_count FROM labevents GROUP BY itemid ORDER BY measurement_count DESC LIMIT 10";
  }
  
  // PRIORITY 8: ICU stay queries
  if (msg.includes('icu') || msg.includes('intensive care')) {
    if (isCountQuery) {
      return "SELECT COUNT(*) as total_icu_stays FROM icustays";
    }
    if (msg.includes('duration') || msg.includes('length')) {
      return "SELECT AVG(CAST((julianday(outtime) - julianday(intime)) as REAL)) as avg_days, MIN(CAST((julianday(outtime) - julianday(intime)) as REAL)) as min_days, MAX(CAST((julianday(outtime) - julianday(intime)) as REAL)) as max_days FROM icustays";
    }
    return "SELECT subject_id, COUNT(*) as stay_count FROM icustays GROUP BY subject_id ORDER BY stay_count DESC LIMIT 10";
  }
  
  // PRIORITY 9: Comparative analysis (male vs female by category)
  if ((msg.includes('male') && msg.includes('female')) || msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ')) {
    if (msg.includes('age')) {
      return "SELECT gender, AVG(anchor_age) as avg_age, COUNT(*) as patient_count FROM patients GROUP BY gender";
    }
    if (msg.includes('admission')) {
      return "SELECT a.admission_type, p.gender, COUNT(*) as count FROM admissions a JOIN patients p ON a.subject_id = p.subject_id GROUP BY a.admission_type, p.gender ORDER BY count DESC";
    }
    if (msg.includes('diagnos')) {
      return "SELECT d.icd_code, p.gender, COUNT(*) as count FROM diagnoses_icd d JOIN patients p ON d.subject_id = p.subject_id GROUP BY d.icd_code, p.gender ORDER BY count DESC LIMIT 10";
    }
  }
  
  // PRIORITY 10: Readmission analysis
  if (msg.includes('readmit') || msg.includes('multiple admission') || msg.includes('repeat admission')) {
    return "SELECT p.subject_id, COUNT(a.hadm_id) as admission_count FROM patients p JOIN admissions a ON p.subject_id = a.subject_id GROUP BY p.subject_id HAVING COUNT(a.hadm_id) > 1 ORDER BY admission_count DESC LIMIT 10";
  }
  
  // PRIORITY 11: Schema/metadata queries
  if (msg.includes('schema') || msg.includes('table') || msg.includes('column') || msg.includes('database structure')) {
    if (msg.includes('column') || msg.includes('field')) {
      return "PRAGMA table_info(patients)";
    }
    return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
  }
  
  // Default fallback
  return "SELECT COUNT(*) as total_patients, SUM(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) as male_count, SUM(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) as female_count FROM patients";
}

// Generate professional answer from data - NO GEMINI REQUIRED
// PHASE 10 FIX: Better handling of complete-list queries, display all IDs when appropriate
function generateAnswerFromData(userMessage, recordCount, data) {
  const msg = userMessage.toLowerCase();
  
  console.log('[ANSWER GENERATION] Creating response from data:', JSON.stringify(data).substring(0, 100));
  
  // Handle gender breakdown (male vs female side-by-side)
  if ((msg.includes('male') && msg.includes('female')) || msg.includes('gender breakdown')) {
    if (data[0]?.gender === 'male' || data[0]?.gender === 'female') {
      const maleRow = data.find(r => r.gender === 'male');
      const femaleRow = data.find(r => r.gender === 'female');
      const maleCount = maleRow?.count || 0;
      const femaleCount = femaleRow?.count || 0;
      return `Gender distribution: ${maleCount} male patients (${Math.round(100*maleCount/100)}%) and ${femaleCount} female patients (${Math.round(100*femaleCount/100)}%).`;
    }
  }
  
  // PHASE 10: Check if user is asking for a complete list
  const wantsAllRecords = msg.includes('all ') || msg.includes('every') || msg.includes('complete') || 
                         msg.includes('list ') || msg.includes(' ids') || msg.includes('full list') ||
                         msg.includes('show all') || msg.includes('give me all');
  
  // Female patient queries - COMPLETE LIST
  if (msg.includes('female') && msg.includes('patient') && !msg.includes('only male') && !msg.match(/\bmale\b/) && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      // If asking for complete list, show ALL IDs
      if (wantsAllRecords || msg.includes('list') || msg.includes(' ids')) {
        const allIds = data.map(p => p.subject_id).join(', ');
        return `All ${recordCount} female patient IDs: ${allIds}`;
      } else {
        const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
        return `Found ${recordCount} female patients matching your criteria. Examples: ${patients}.`;
      }
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} female patients in the database with detailed clinical information.`;
    }
  }
  
  // Male patient queries - COMPLETE LIST
  if (msg.includes('male') && msg.includes('patient') && !msg.includes('female') && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      // If asking for complete list, show ALL IDs
      if (wantsAllRecords || msg.includes('list') || msg.includes(' ids')) {
        const allIds = data.map(p => p.subject_id).join(', ');
        return `All ${recordCount} male patient IDs: ${allIds}`;
      } else {
        const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
        return `Found ${recordCount} male patients matching your criteria. Examples: ${patients}.`;
      }
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} male patients in the database with comprehensive medical histories.`;
    }
  }
  
  // Total patient count (only if no gender specified) - COMPLETE LIST
  if ((msg.includes('how many') || msg.includes('total') || msg.includes('count')) && msg.includes('patient') && !msg.includes('male') && !msg.includes('female') && !msg.includes('gender')) {
    const count = data[0]?.count || 0;
    if (wantsAllRecords && data[0]?.subject_id) {
      // Show all IDs if requested
      const allIds = data.map(p => p.subject_id).join(', ');
      return `The database contains ${count} unique patients. All patient IDs: ${allIds}`;
    }
    return `The database contains ${count} unique patients with comprehensive clinical documentation.`;
  }
  
  // All patient IDs (general "show all IDs" query) - COMPLETE LIST
  if ((msg.includes('show') || msg.includes('list') || msg.includes('all') || msg.includes('give me')) && msg.includes('id') && !msg.includes('male') && !msg.includes('female')) {
    if (data[0]?.subject_id) {
      const allIds = data.map(p => p.subject_id).join(', ');
      return `All ${recordCount} patient IDs in the database: ${allIds}`;
    } else if (data[0]?.count !== undefined) {
      return `The database contains ${data[0].count} patients.`;
    }
  }
  
  // Age-filtered patient queries
  if ((msg.includes('older than') || msg.includes('over') || msg.includes('younger than') || msg.includes('under') || msg.includes('between') || msg.includes('aged')) && (msg.includes('patient') || msg.includes('find'))) {
    if (data[0]?.subject_id) {
      const patients = data.slice(0, 5).map((p) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
      return `Found ${recordCount} patients matching the age criteria. Examples: ${patients}.`;
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} patients matching your age criteria in the database.`;
    }
  }
  
  // Patient detail queries
  if ((msg.includes('show details') || msg.includes('patient') && msg.includes('detail')) && data[0]?.subject_id) {
    const patients = data.slice(0, 10).map((p) => `#${p.subject_id}: ${p.gender.toUpperCase()}, age ${p.anchor_age}`).join('; ');
    return `Patient details (${recordCount} records): ${patients}.`;
  }
  
  // Admission queries
  if (msg.includes('admission') || msg.includes('admitted')) {
    if (data[0]?.admission_count) {
      return `The database contains ${data[0].admission_count} hospital admissions across the patient cohort.`;
    }
    if (data[0]?.admission_type) {
      const types = data.map(d => `${d.admission_type}: ${d.count}`).join(', ');
      return `Hospital admission types: ${types}.`;
    }
  }
  
  // Medication/Prescription queries
  if (msg.includes('medicin') || msg.includes('medication') || msg.includes('drug') || msg.includes('prescription') || msg.includes('pharma')) {
    if (data[0]?.total_prescriptions) {
      return `A total of ${data[0].total_prescriptions} prescriptions are documented in the database.`;
    }
    if (data[0]?.drug) {
      const topDrugs = data.slice(0, 5).map(d => `${d.drug} (${d.count} uses)`).join(', ');
      return `Top medications: ${topDrugs}.`;
    }
  }
  
  // Lab test queries
  if (msg.includes('lab') || msg.includes('test') || msg.includes('measurement')) {
    if (data[0]?.total_tests) {
      return `The database contains ${data[0].total_tests} laboratory test measurements.`;
    }
    if (data[0]?.label || data[0]?.itemid) {
      const tests = data.slice(0, 5).map(d => d.label ? `${d.label} (${d.measurement_count})` : `Item ${d.itemid} (${d.measurement_count})`).join(', ');
      return `Common laboratory tests: ${tests}.`;
    }
    return `Laboratory testing shows ${recordCount} different test types with varying frequencies.`;
  }
  
  // Diagnosis queries
  if (msg.includes('diagnos') || msg.includes('condition') || msg.includes('icd')) {
    if (data[0]?.total_diagnoses) {
      return `The database documents ${data[0].total_diagnoses} diagnostic records using ICD coding.`;
    }
    if (data[0]?.long_title) {
      // ICD with descriptions
      const diagnoses = data.slice(0, 5).map((d, i) => `${d.icd_code}: ${d.long_title} (${d.patient_count} patients)`).join('; ');
      return `Top diagnoses: ${diagnoses}.`;
    }
    if (data[0]?.icd_code) {
      const codes = data.slice(0, 5).map(d => `${d.icd_code} (${d.count} cases)`).join(', ');
      return `Most frequently recorded diagnoses: ${codes}.`;
    }
  }
  
  // Age statistics
  if (msg.includes('age') && (msg.includes('average') || msg.includes('mean') || msg.includes('distribution') || msg.includes('minimum') || msg.includes('maximum') || (msg.includes('min') && msg.includes('max')))) {
    if (data[0]?.average_age) {
      const avg = Math.round(data[0].average_age);
      const min = data[0].min_age;
      const max = data[0].max_age;
      return `Patient age statistics: minimum ${min} years, maximum ${max} years, average ${avg} years.`;
    }
    if (data[0]?.min_age && !data[0]?.average_age) {
      const min = data[0].min_age;
      const max = data[0].max_age;
      return `Patient age range: minimum ${min} years, maximum ${max} years.`;
    }
  }
  
  // ICU stay queries
  if (msg.includes('icu') || msg.includes('intensive care')) {
    if (data[0]?.total_icu_stays) {
      return `The database contains ${data[0].total_icu_stays} ICU stay records.`;
    }
    if (data[0]?.avg_days) {
      const avg = parseFloat(data[0].avg_days).toFixed(1);
      const min = parseFloat(data[0].min_days).toFixed(1);
      const max = parseFloat(data[0].max_days).toFixed(1);
      return `ICU stay duration statistics: average ${avg} days (range: ${min} - ${max} days).`;
    }
  }
  
  // Comparative analysis
  if (msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ')) {
    if (data[0]?.gender && data[0]?.avg_age) {
      return `Age by gender: ${data.map(d => `${d.gender}: ${d.avg_age.toFixed(1)} years`).join(', ')}.`;
    }
    if (data[0]?.admission_type && data[0]?.gender) {
      const summary = data.slice(0, 5).map(d => `${d.admission_type} (${d.gender}): ${d.count}`).join('; ');
      return `Admission analysis by gender: ${summary}.`;
    }
  }
  
  // Readmission analysis
  if (msg.includes('readmit') || msg.includes('multiple admission') || msg.includes('repeat admission')) {
    if (data[0]?.admission_count) {
      const patients = data.slice(0, 5).map(d => `Patient #${d.subject_id} (${d.admission_count} admissions)`).join(', ');
      return `Patients with multiple admissions: ${patients}.`;
    }
  }
  
  // Schema/metadata queries
  if (msg.includes('schema') || msg.includes('table') || msg.includes('column') || msg.includes('database structure')) {
    if (data[0]?.name) {
      // Table listing
      const tables = data.map(d => d.name).join(', ');
      return `Database tables: ${tables}.`;
    }
    if (data[0]?.type) {
      // Column listing (from PRAGMA)
      const columns = data.map(d => `${d.name} (${d.type})`).join(', ');
      return `Patients table columns: ${columns}.`;
    }
  }
  
  // Check if this looks like malformed input (only symbols, no actual words)
  const hasActualWords = /[a-z]{2,}/i.test(userMessage);
  if (!hasActualWords) {
    return `I cannot understand that question. Please ask about patient data, medical conditions, medications, laboratory tests, admissions, or ICU stays.`;
  }
  
  // Check if this looks like an unsupported question
  // If the default fallback was triggered, it means no pattern matched
  const unsupportedKeywords = ['weather', 'ceo', 'director', 'president', 'staff', 'hospital name', 'address', 'phone', 'hours', 'location'];
  const isLikelyUnsupported = unsupportedKeywords.some(kw => msg.includes(kw));
  
  if (isLikelyUnsupported) {
    return `I cannot answer that question. I can only answer questions about patient data, medical conditions, medications, laboratory tests, admissions, and ICU stays available in this database.`;
  }
  
  // Generic response for questions that generate results but don't match any specific handler
  return `The database query returned ${recordCount} records with detailed clinical information available for further analysis.`;
}

export async function POST(request) {
  const { runQuery, verifyAuth } = await import('../../../../backend/database/connection.js');
  
  try {
    // Verify authentication
    const session = verifyAuth(request);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    
    // Support both formats: 
    // 1. Frontend format: { messages: [...] }
    // 2. Legacy test format: { question: "..." }
    let userMessage = null;
    
    if (body.messages && Array.isArray(body.messages)) {
      // Frontend format
      userMessage = body.messages[body.messages.length - 1]?.content;
    } else if (body.question) {
      // Legacy format
      userMessage = body.question;
    }

    if (!userMessage || userMessage.trim() === '') {
      return new Response(
        JSON.stringify({ success: false, error: 'No message provided' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[START] Question:', userMessage);

    // Check cache
    const cacheKey = userMessage.toLowerCase();
    if (queryCache.has(cacheKey)) {
      console.log('[CACHE HIT]');
      return new Response(JSON.stringify(queryCache.get(cacheKey)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Generate SQL using intelligent patterns (NO GEMINI)
    console.log('[STEP 1] Generating SQL with pattern matching...');
    let sqlQuery;
    try {
      sqlQuery = generateSQLWithPatterns(userMessage);
      console.log('[SQL Generated]:', sqlQuery);
    } catch (err) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: err.message
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 2: Execute query on actual dataset
    console.log('[STEP 2] Executing query on actual dataset...');
    const queryResult = runQuery(sqlQuery);

    if (!queryResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database query failed: ' + queryResult.error,
          sqlQuery: sqlQuery
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const recordCount = queryResult.data.length;
    console.log(`[STEP 2] Found ${recordCount} records from dataset`);

    if (recordCount === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          question: userMessage,
          clinical_answer: 'No records found matching your query in the dataset.',
          records_found: 0,
          data: []
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Generate professional answer using pattern matching (NO GEMINI)
    console.log('[STEP 3] Generating professional answer...');
    let clinicalAnswer;
    try {
      clinicalAnswer = generateAnswerFromData(userMessage, recordCount, queryResult.data);
    } catch (err) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate answer: ' + err.message
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('[COMPLETE] Query processed successfully');

    const response = {
      success: true,
      question: userMessage,
      clinical_answer: clinicalAnswer,
      records_found: recordCount,
      data: queryResult.data.slice(0, 100)
    };

    // Cache result
    if (queryCache.size >= MAX_CACHE_SIZE) {
      const firstKey = queryCache.keys().next().value;
      queryCache.delete(firstKey);
    }
    queryCache.set(cacheKey, response);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ERROR]', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

