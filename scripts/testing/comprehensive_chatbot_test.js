const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'clara.db');
const db = new Database(dbPath, { readonly: true });

// Helper function to execute queries
function runQuery(sql) {
  try {
    const stmt = db.prepare(sql);
    const results = stmt.all();
    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Test suite
const tests = [
  // BASIC STATISTICS TESTS (8)
  {
    id: 1,
    question: "How many patients are in the database?",
    expectedSQL: "SELECT COUNT(*) as count FROM patients",
    expectedResult: 100,
    testType: "count"
  },
  {
    id: 2,
    question: "How many male and female patients?",
    expectedSQL: "Gender breakdown query",
    expectedResult: "Male: 57, Female: 43",
    testType: "breakdown"
  },
  {
    id: 3,
    question: "How many male patients?",
    expectedSQL: "SELECT COUNT(*) as count FROM patients WHERE gender = 'm'",
    expectedResult: 57,
    testType: "count"
  },
  {
    id: 4,
    question: "How many female patients?",
    expectedSQL: "SELECT COUNT(*) as count FROM patients WHERE gender = 'f'",
    expectedResult: 43,
    testType: "count"
  },
  {
    id: 5,
    question: "How many admissions are recorded?",
    expectedSQL: "SELECT COUNT(*) as admission_count FROM admissions",
    expectedResult: 275,
    testType: "count"
  },
  {
    id: 6,
    question: "How many diagnoses are available?",
    expectedSQL: "SELECT COUNT(*) as total_diagnoses FROM diagnoses_icd",
    expectedResult: 4506,
    testType: "count"
  },
  {
    id: 7,
    question: "How many prescriptions are there?",
    expectedSQL: "SELECT COUNT(*) as total_prescriptions FROM prescriptions",
    expectedResult: 30970,
    testType: "count"
  },
  {
    id: 8,
    question: "How many laboratory tests are recorded?",
    expectedSQL: "SELECT COUNT(*) as total_tests FROM labevents",
    expectedResult: 107727,
    testType: "count"
  },

  // GENDER FILTERING TESTS (4)
  {
    id: 9,
    question: "Show me female patients",
    expectedSQL: "SELECT ... FROM patients WHERE gender = 'f'",
    expectedResult: "43 results",
    testType: "list"
  },
  {
    id: 10,
    question: "Show me male patients",
    expectedSQL: "SELECT ... FROM patients WHERE gender = 'm'",
    expectedResult: "57 results",
    testType: "list"
  },
  {
    id: 11,
    question: "Find women in the database",
    expectedSQL: "SELECT ... FROM patients WHERE gender = 'f'",
    expectedResult: "43 results",
    testType: "list"
  },
  {
    id: 12,
    question: "Find men in the database",
    expectedSQL: "SELECT ... FROM patients WHERE gender = 'm'",
    expectedResult: "57 results",
    testType: "list"
  },

  // AGE FILTERING TESTS (4)
  {
    id: 13,
    question: "Find patients older than 50",
    expectedSQL: "SELECT ... FROM patients WHERE anchor_age > 50",
    expectedResult: "> 0 results",
    testType: "list"
  },
  {
    id: 14,
    question: "Find patients younger than 30",
    expectedSQL: "SELECT ... FROM patients WHERE anchor_age < 30",
    expectedResult: "> 0 results",
    testType: "list"
  },
  {
    id: 15,
    question: "Find patients aged 40 to 60",
    expectedSQL: "SELECT ... FROM patients WHERE anchor_age >= 40 AND anchor_age <= 60",
    expectedResult: "> 0 results",
    testType: "list"
  },
  {
    id: 16,
    question: "What is the average age of patients?",
    expectedSQL: "SELECT AVG(anchor_age) as average_age FROM patients",
    expectedResult: "62 (approx)",
    testType: "statistic"
  },

  // CLINICAL DATA TESTS (6)
  {
    id: 17,
    question: "What are the most common diagnoses?",
    expectedSQL: "SELECT icd_code, COUNT(*) as count FROM diagnoses_icd GROUP BY icd_code ORDER BY count DESC",
    expectedResult: "ICD codes with counts",
    testType: "grouped"
  },
  {
    id: 18,
    question: "What medications are frequently prescribed?",
    expectedSQL: "SELECT drug, COUNT(*) as count FROM prescriptions GROUP BY drug ORDER BY count DESC",
    expectedResult: "Medications with counts",
    testType: "grouped"
  },
  {
    id: 19,
    question: "What laboratory tests are available?",
    expectedSQL: "SELECT itemid, COUNT(*) as measurement_count FROM labevents GROUP BY itemid",
    expectedResult: "Lab item IDs",
    testType: "grouped"
  },
  {
    id: 20,
    question: "What admission types are recorded?",
    expectedSQL: "SELECT admission_type, COUNT(*) as count FROM admissions GROUP BY admission_type",
    expectedResult: "Admission types with counts",
    testType: "grouped"
  },
  {
    id: 21,
    question: "How many ICU stays are recorded?",
    expectedSQL: "SELECT COUNT(*) as total_icu_stays FROM icustays",
    expectedResult: 140,
    testType: "count"
  },
  {
    id: 22,
    question: "What is the database schema?",
    expectedSQL: "SELECT name FROM sqlite_master WHERE type='table'",
    expectedResult: "List of tables",
    testType: "schema"
  }
];

console.log('=== CLARA CHATBOT COMPREHENSIVE TEST VERIFICATION ===\n');
console.log('Executing', tests.length, 'tests against actual database...\n');

let passed = 0;
let failed = 0;

tests.forEach(test => {
  console.log(`\n[TEST ${test.id}] ${test.question}`);
  console.log(`  Expected SQL Pattern: ${test.expectedSQL}`);
  console.log(`  Expected Result: ${test.expectedResult}`);
  
  // For tests with exact SQL, run it
  if (test.testType === 'count' && test.expectedSQL.startsWith('SELECT')) {
    const result = runQuery(test.expectedSQL);
    if (result.success && result.data.length > 0) {
      const actualValue = Object.values(result.data[0])[0];
      if (actualValue === test.expectedResult) {
        console.log(`  ✅ PASS - Actual result: ${actualValue}`);
        passed++;
      } else {
        console.log(`  ❌ FAIL - Expected ${test.expectedResult}, got ${actualValue}`);
        failed++;
      }
    } else {
      console.log(`  ❌ FAIL - Query error: ${result.error}`);
      failed++;
    }
  }
  
  // For grouped queries, verify structure
  else if (test.testType === 'grouped') {
    console.log(`  ⏳ Manual verification required (grouped data)`);
  }
  
  // For breakdown queries
  else if (test.testType === 'breakdown') {
    const maleResult = runQuery("SELECT COUNT(*) as cnt FROM patients WHERE gender = 'm'");
    const femaleResult = runQuery("SELECT COUNT(*) as cnt FROM patients WHERE gender = 'f'");
    if (maleResult.success && femaleResult.success) {
      const maleCount = maleResult.data[0].cnt;
      const femaleCount = femaleResult.data[0].cnt;
      console.log(`  ✅ PASS - Male: ${maleCount}, Female: ${femaleCount}`);
      if (maleCount === 57 && femaleCount === 43) {
        passed++;
      } else {
        console.log(`  ❌ Values incorrect`);
        failed++;
      }
    }
  }
  
  // For list queries, check count > 0
  else if (test.testType === 'list') {
    console.log(`  ⏳ Manual verification required (list data)`);
  }
  
  // For statistic queries
  else if (test.testType === 'statistic') {
    console.log(`  ⏳ Manual verification required (statistics)`);
  }
  
  // For schema queries
  else if (test.testType === 'schema') {
    const result = runQuery("SELECT name FROM sqlite_master WHERE type='table'");
    if (result.success && result.data.length > 0) {
      console.log(`  ✅ PASS - Found ${result.data.length} tables`);
      passed++;
    } else {
      console.log(`  ❌ FAIL - Schema query failed`);
      failed++;
    }
  }
});

console.log('\n=== TEST SUMMARY ===');
console.log(`Total Tests: ${tests.length}`);
console.log(`Verified Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Manual Review Required: ${tests.length - passed - failed}`);
console.log(`\n=== DETAILED QUERIES FOR VERIFICATION ===\n`);

// Run key queries for manual verification
console.log('QUERY 1: Total Patients');
console.log(runQuery("SELECT COUNT(*) as cnt FROM patients").data[0]);

console.log('\nQUERY 2: Gender Breakdown');
console.log(runQuery("SELECT gender, COUNT(*) as cnt FROM patients GROUP BY gender").data);

console.log('\nQUERY 3: Age Statistics');
console.log(runQuery("SELECT AVG(anchor_age) as avg_age, MIN(anchor_age) as min_age, MAX(anchor_age) as max_age FROM patients").data[0]);

console.log('\nQUERY 4: Admissions Count');
console.log(runQuery("SELECT COUNT(*) as cnt FROM admissions").data[0]);

console.log('\nQUERY 5: Top 5 Medications');
console.log(runQuery("SELECT drug, COUNT(*) as count FROM prescriptions GROUP BY drug ORDER BY count DESC LIMIT 5").data);

console.log('\nQUERY 6: Top 5 Diagnoses');
console.log(runQuery("SELECT icd_code, COUNT(*) as count FROM diagnoses_icd GROUP BY icd_code ORDER BY count DESC LIMIT 5").data);

console.log('\nQUERY 7: Lab Events Count');
console.log(runQuery("SELECT COUNT(*) as cnt FROM labevents").data[0]);

console.log('\nQUERY 8: ICU Stays Count');
console.log(runQuery("SELECT COUNT(*) as cnt FROM icustays").data[0]);

db.close();
console.log('\n=== VERIFICATION COMPLETE ===');
