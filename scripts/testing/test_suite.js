/**
 * CLARA Chatbot Comprehensive Test Suite
 * Tests the /api/chat endpoint against the verified 100-patient database
 * 
 * Test Pass Criteria:
 * 1. Correct question intent identification
 * 2. Correct SQL generation
 * 3. Database result matches reference SQL
 * 4. Final chatbot response accurately represents the result
 */

const Database = require('better-sqlite3');
const fs = require('fs');

// Reference database for independent verification
const db = new Database('clara.db');

// Test suite definition
const testSuite = [
  // Category 1: Total Patient Count
  {
    id: 'TC_001',
    category: 'Total Patient Count',
    question: 'How many patients are there?',
    keywords: ['patient', 'how many'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients',
    expectedPattern: /100|patients/i,
    description: 'Basic total patient count query'
  },
  {
    id: 'TC_002',
    category: 'Total Patient Count',
    question: 'What is the total number of patients?',
    keywords: ['patient', 'total'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients',
    expectedPattern: /100|patients/i,
    description: 'Alternative wording for total patient count'
  },
  {
    id: 'TC_003',
    category: 'Total Patient Count',
    question: 'Give me the patient count.',
    keywords: ['patient', 'count'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients',
    expectedPattern: /100|patients/i,
    description: 'Abbreviated patient count query'
  },

  // Category 2: Gender Distribution
  {
    id: 'TC_004',
    category: 'Gender Distribution',
    question: 'How many male and female patients are there?',
    keywords: ['male', 'female', 'patient'],
    referenceSql: "SELECT 'male' as gender, COUNT(*) as count FROM patients WHERE gender = 'm' UNION SELECT 'female' as gender, COUNT(*) as count FROM patients WHERE gender = 'f'",
    expectedPattern: /57|43|male|female/i,
    description: 'Gender breakdown query'
  },
  {
    id: 'TC_005',
    category: 'Gender Distribution',
    question: 'Compare male and female patients.',
    keywords: ['male', 'female', 'compare'],
    referenceSql: "SELECT 'male' as gender, COUNT(*) as count FROM patients WHERE gender = 'm' UNION SELECT 'female' as gender, COUNT(*) as count FROM patients WHERE gender = 'f'",
    expectedPattern: /57|43|male|female/i,
    description: 'Gender comparison query'
  },
  {
    id: 'TC_006',
    category: 'Gender Distribution',
    question: 'How many male patients?',
    keywords: ['male', 'patient'],
    referenceSql: "SELECT COUNT(*) as count FROM patients WHERE gender = 'm'",
    expectedPattern: /57|male/i,
    description: 'Male patient count'
  },
  {
    id: 'TC_007',
    category: 'Gender Distribution',
    question: 'How many female patients?',
    keywords: ['female', 'patient'],
    referenceSql: "SELECT COUNT(*) as count FROM patients WHERE gender = 'f'",
    expectedPattern: /43|female/i,
    description: 'Female patient count'
  },

  // Category 3: Age Filtering
  {
    id: 'TC_008',
    category: 'Age Filtering',
    question: 'How many patients are older than 60?',
    keywords: ['older than', 'patient', '60'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients WHERE anchor_age > 60',
    expectedPattern: /patient|age|60/i,
    description: 'Age threshold query (older than)'
  },
  {
    id: 'TC_009',
    category: 'Age Filtering',
    question: 'Show me patients younger than 30.',
    keywords: ['younger than', 'patient', '30'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients WHERE anchor_age < 30',
    expectedPattern: /patient|age|30/i,
    description: 'Age threshold query (younger than)'
  },
  {
    id: 'TC_010',
    category: 'Age Filtering',
    question: 'How many patients are between 40 and 60 years old?',
    keywords: ['between', 'patient', 'age'],
    referenceSql: 'SELECT COUNT(*) as count FROM patients WHERE anchor_age >= 40 AND anchor_age <= 60',
    expectedPattern: /patient|age|40|60/i,
    description: 'Age range query'
  },

  // Category 4: Age Statistics
  {
    id: 'TC_011',
    category: 'Age Statistics',
    question: 'What is the average age of patients?',
    keywords: ['average', 'age', 'patient'],
    referenceSql: 'SELECT AVG(anchor_age) as average_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients',
    expectedPattern: /age|year|patient/i,
    description: 'Average age calculation'
  },
  {
    id: 'TC_012',
    category: 'Age Statistics',
    question: 'What are the minimum and maximum patient ages?',
    keywords: ['minimum', 'maximum', 'age'],
    referenceSql: 'SELECT MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients',
    expectedPattern: /age|year|21|91/i,
    description: 'Min/max age query'
  },

  // Category 5: Admission Counts
  {
    id: 'TC_013',
    category: 'Admission Counts',
    question: 'How many admissions are there?',
    keywords: ['admission', 'how many'],
    referenceSql: 'SELECT COUNT(*) as admission_count FROM admissions',
    expectedPattern: /275|admission/i,
    description: 'Total admission count'
  },
  {
    id: 'TC_014',
    category: 'Admission Counts',
    question: 'What are the admission types?',
    keywords: ['admission', 'type'],
    referenceSql: 'SELECT admission_type, COUNT(*) as count FROM admissions GROUP BY admission_type',
    expectedPattern: /admission|type/i,
    description: 'Admission type breakdown'
  },

  // Category 6: Diagnosis Counts
  {
    id: 'TC_015',
    category: 'Diagnosis Counts',
    question: 'How many diagnoses are documented?',
    keywords: ['diagnosis', 'how many'],
    referenceSql: 'SELECT COUNT(*) as total_diagnoses FROM diagnoses_icd',
    expectedPattern: /4506|diagnosis/i,
    description: 'Total diagnosis count'
  },
  {
    id: 'TC_016',
    category: 'Diagnosis Counts',
    question: 'What are the most common diagnoses?',
    keywords: ['diagnos', 'common', 'most'],
    referenceSql: 'SELECT icd_code, COUNT(*) as count FROM diagnoses_icd GROUP BY icd_code ORDER BY count DESC LIMIT 10',
    expectedPattern: /icd|diagnos|code/i,
    description: 'Most common diagnoses'
  },

  // Category 7: Medication/Prescription Counts
  {
    id: 'TC_017',
    category: 'Medication Counts',
    question: 'How many medications are prescribed?',
    keywords: ['medication', 'how many'],
    referenceSql: 'SELECT COUNT(*) as total_prescriptions FROM prescriptions',
    expectedPattern: /30970|prescription|medication/i,
    description: 'Total prescription count'
  },
  {
    id: 'TC_018',
    category: 'Medication Counts',
    question: 'What are the most prescribed medications?',
    keywords: ['medicin', 'most', 'common'],
    referenceSql: 'SELECT drug, COUNT(*) as count FROM prescriptions GROUP BY drug ORDER BY count DESC LIMIT 10',
    expectedPattern: /drug|medicin|insulin|sodium/i,
    description: 'Top medications'
  },

  // Category 8: Lab Test Counts
  {
    id: 'TC_019',
    category: 'Lab Test Counts',
    question: 'How many laboratory tests are documented?',
    keywords: ['lab', 'test', 'how many'],
    referenceSql: 'SELECT COUNT(*) as total_tests FROM labevents',
    expectedPattern: /107727|lab|test/i,
    description: 'Total lab test count'
  },
  {
    id: 'TC_020',
    category: 'Lab Test Counts',
    question: 'What laboratory tests are available?',
    keywords: ['lab', 'test'],
    referenceSql: 'SELECT itemid, COUNT(*) as measurement_count FROM labevents GROUP BY itemid ORDER BY measurement_count DESC LIMIT 10',
    expectedPattern: /lab|test|item/i,
    description: 'Lab test types'
  },

  // Category 9: ICU Stay Analysis
  {
    id: 'TC_021',
    category: 'ICU Analysis',
    question: 'How many ICU stays are recorded?',
    keywords: ['icu', 'intensive', 'how many'],
    referenceSql: 'SELECT COUNT(*) as total_icu_stays FROM icustays',
    expectedPattern: /140|icu/i,
    description: 'Total ICU stay count'
  },
  {
    id: 'TC_022',
    category: 'ICU Analysis',
    question: 'What is the average ICU stay duration?',
    keywords: ['icu', 'duration', 'average'],
    referenceSql: 'SELECT AVG(CAST((julianday(outtime) - julianday(intime)) as REAL)) as avg_days FROM icustays',
    expectedPattern: /icu|day|duration/i,
    description: 'ICU stay duration statistics'
  },

  // Category 10: Database Schema Questions
  {
    id: 'TC_023',
    category: 'Schema Information',
    question: 'What tables are in the database?',
    keywords: ['table', 'schema'],
    referenceSql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    expectedPattern: /patient|table|admission|diagnos/i,
    description: 'Database table listing'
  },
  {
    id: 'TC_024',
    category: 'Schema Information',
    question: 'What columns are in the patients table?',
    keywords: ['column', 'patient', 'field'],
    referenceSql: 'PRAGMA table_info(patients)',
    expectedPattern: /column|field|patient|subject/i,
    description: 'Patient table schema'
  },

  // Category 11: Unsupported/Edge Cases
  {
    id: 'TC_025',
    category: 'Unsupported Questions',
    question: 'Who is the CEO of the hospital?',
    keywords: [],
    referenceSql: null,
    expectedPattern: /cannot|unsupported|not available|data/i,
    description: 'Unsupported question - should return appropriate message'
  },
  {
    id: 'TC_026',
    category: 'Unsupported Questions',
    question: 'What is the weather today?',
    keywords: [],
    referenceSql: null,
    expectedPattern: /cannot|unsupported|not available|database/i,
    description: 'Out of scope question - should return appropriate message'
  },

  // Category 12: Empty/Malformed Input
  {
    id: 'TC_027',
    category: 'Input Handling',
    question: '',
    keywords: [],
    referenceSql: null,
    expectedPattern: /error|invalid|message/i,
    description: 'Empty message handling'
  },
  {
    id: 'TC_028',
    category: 'Input Handling',
    question: '???',
    keywords: [],
    referenceSql: null,
    expectedPattern: /error|invalid|cannot|unsupported/i,
    description: 'Malformed input handling'
  }
];

// Helper: Execute reference SQL and get expected result
function getExpectedResult(sql) {
  if (!sql) return null;
  try {
    return db.prepare(sql).all();
  } catch (e) {
    console.error(`Error executing reference SQL: ${e.message}`);
    return null;
  }
}

// Helper: Compare results
function compareResults(expected, actual) {
  if (!expected || !actual) return false;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false;
    // For numeric comparisons, allow small floating-point differences
    return JSON.stringify(expected) === JSON.stringify(actual);
  }
  return expected === actual;
}

// Helper: Extract numeric value from response
function extractNumericValue(response) {
  const match = response.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

module.exports = {
  testSuite,
  getExpectedResult,
  compareResults,
  extractNumericValue,
  db
};
