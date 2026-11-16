/**
 * Debug script to see what SQL is generated for each test question
 */

const testQuestions = [
  'How many patients are there?',
  'What is the total number of patients?',
  'Give me the patient count.',
  'How many male and female patients are there?',
  'Compare male and female patients.',
  'How many male patients?',
  'How many female patients?',
  'What is the average age of patients?',
  'What are the minimum and maximum patient ages?',
  'What columns are in the patients table?',
];

// Stub functions to mimic the actual code
function detectGenderContext(msg) {
  const hasFemale = msg.includes('female') || msg.includes('woman') || msg.includes('women');
  const hasMale = msg.includes('male') || msg.includes('man') || msg.includes('men');
  const hasPatientContext = msg.includes('patient') || msg.includes('find') || msg.includes('show') || msg.includes('list');
  
  if (hasFemale && hasMale) {
    return 'both';
  } else if (hasFemale && hasPatientContext) {
    return 'female';
  } else if (hasMale && hasPatientContext) {
    return 'male';
  }
  return null;
}

function generateSQLWithPatterns(userMessage) {
  const msg = userMessage.toLowerCase();
  
  console.log(`\n[Q] ${userMessage}`);
  console.log(`[M] ${msg}`);
  
  // Detect query intent indicators
  let isCountQuery = msg.includes('how many') || msg.includes('total') || msg.includes('count');
  let isComparisonQuery = msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ');
  let isStatQuery = msg.includes('average') || msg.includes('mean') || msg.includes('minimum') || msg.includes('maximum') || msg.includes('min') || msg.includes('max');
  
  console.log(`[FLAGS] isCountQuery=${isCountQuery}, isComparisonQuery=${isComparisonQuery}, isStatQuery=${isStatQuery}`);
  
  // PRIORITY 1: Schema/metadata queries
  if (msg.includes('schema') || msg.includes('table') || msg.includes('column') || msg.includes('database structure') || msg.includes('field')) {
    console.log('[MATCHED] Schema query');
    if (msg.includes('column') || msg.includes('field')) {
      return "PRAGMA table_info(patients)";
    }
    return "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
  }
  
  // PRIORITY 2: Gender breakdown
  const genderContext = detectGenderContext(msg);
  console.log(`[GENDER] genderContext=${genderContext}`);
  if ((genderContext === 'both' && isCountQuery) || (isComparisonQuery && msg.includes('male') && msg.includes('female'))) {
    console.log('[MATCHED] Gender breakdown');
    return "SELECT 'male' as gender, COUNT(*) as count FROM patients WHERE gender = 'm' UNION SELECT 'female' as gender, COUNT(*) as count FROM patients WHERE gender = 'f'";
  }
  
  // PRIORITY 3: Patient queries
  if (msg.includes('patient') || msg.includes('find') || msg.includes('show ')) {
    console.log('[MATCHED] Patient query');
    // Would do conditions building here but skipping for debug
    if (isCountQuery) {
      return "SELECT COUNT(*) as count FROM patients";
    }
    return "SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients LIMIT 20";
  }
  
  // ... other priorities skipped for this debug ...
  
  // PRIORITY 7: Age statistics
  if (msg.includes('age') && !msg.includes('patient')) {
    console.log('[MATCHED] Age statistics (not patient)');
    if (msg.includes('average') || msg.includes('mean')) {
      return "SELECT AVG(anchor_age) as average_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
    }
    if (msg.includes('minimum') || msg.includes('maximum') || msg.includes('min') || msg.includes('max')) {
      return "SELECT MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
    }
    return "SELECT AVG(anchor_age) as average_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients";
  }
  
  // Fallback
  console.log('[MATCHED] DEFAULT FALLBACK');
  return "SELECT COUNT(*) as total_patients, SUM(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) as male_count, SUM(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) as female_count FROM patients";
}

console.log('='.repeat(70));
console.log('SQL GENERATION DEBUG');
console.log('='.repeat(70));

for (const question of testQuestions) {
  const sql = generateSQLWithPatterns(question);
  console.log(`[SQL] ${sql.substring(0, 80)}...`);
}
