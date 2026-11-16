const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'clara.db');
const db = new Database(dbPath, { readonly: true });

console.log('=== DATABASE VERIFICATION ===\n');
console.log('Database Path:', dbPath);
console.log('');

// Get all tables
console.log('All Tables in Database:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log(`  - ${t.name}`));
console.log('');

// Get record counts for each table
console.log('Record Counts:');
const counts = {};

for (const table of tables) {
  if (table.name.startsWith('sqlite_')) continue;
  
  try {
    const result = db.prepare(`SELECT COUNT(*) as cnt FROM ${table.name}`).get();
    counts[table.name] = result.cnt;
    console.log(`  ${table.name}: ${result.cnt}`);
  } catch (e) {
    console.log(`  ${table.name}: ERROR - ${e.message}`);
  }
}

console.log('');

// Detailed patient analysis
console.log('Patient Analysis:');
const patientTotal = db.prepare('SELECT COUNT(*) as cnt FROM patients').get();
console.log(`  Total Patients: ${patientTotal.cnt}`);

const genderBreakdown = db.prepare('SELECT gender, COUNT(*) as cnt FROM patients GROUP BY gender').all();
console.log(`  Gender Breakdown:`);
genderBreakdown.forEach(row => {
  const gender = row.gender === 'f' ? 'Female' : row.gender === 'm' ? 'Male' : 'Unknown';
  console.log(`    ${gender}: ${row.cnt}`);
});

const ageStats = db.prepare('SELECT MIN(anchor_age) as min_age, MAX(anchor_age) as max_age, AVG(anchor_age) as avg_age FROM patients').get();
console.log(`  Age Statistics: Min=${ageStats.min_age}, Max=${ageStats.max_age}, Avg=${Math.round(ageStats.avg_age)}`);

console.log('');

// Database integrity checks
console.log('Database Integrity Checks:');
const integrityCheck = db.prepare('PRAGMA integrity_check').get();
console.log(`  Integrity Check: ${integrityCheck.integrity_check}`);

const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
console.log(`  Foreign Key Violations: ${fkCheck.length}`);
if (fkCheck.length > 0) {
  fkCheck.slice(0, 5).forEach(v => {
    console.log(`    - Table: ${v.table}, Child Key: ${v.rowid}`);
  });
}

console.log('');
console.log('=== VERIFICATION COMPLETE ===');

db.close();
