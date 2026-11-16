const Database = require('better-sqlite3');
const db = new Database('clara.db');

const queries = {
  'Total patients': 'SELECT COUNT(*) as count FROM patients',
  'Male patients': "SELECT COUNT(*) as count FROM patients WHERE gender = 'm'",
  'Female patients': "SELECT COUNT(*) as count FROM patients WHERE gender = 'f'",
  'Admissions': 'SELECT COUNT(*) as count FROM admissions',
  'Prescriptions': 'SELECT COUNT(*) as count FROM prescriptions',
  'Lab events': 'SELECT COUNT(*) as count FROM labevents',
  'Diagnoses': 'SELECT COUNT(*) as count FROM diagnoses_icd',
  'ICU stays': 'SELECT COUNT(*) as count FROM icustays'
};

console.log('DATABASE VERIFICATION:');
console.log('='.repeat(50));

for (const [label, query] of Object.entries(queries)) {
  try {
    const result = db.prepare(query).get();
    console.log(`${label}: ${result.count}`);
  } catch (e) {
    console.log(`${label}: ERROR - ${e.message}`);
  }
}

console.log('='.repeat(50));
db.close();
