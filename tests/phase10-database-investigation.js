#!/usr/bin/env node
/**
 * Phase 10 Database Investigation Script
 * Directly queries the database to understand current state and identify issues
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'database', 'clara.db');

console.log(`📊 PHASE 10 DATABASE INVESTIGATION`);
console.log(`Database Path: ${dbPath}`);
console.log(`Exists: ${fs.existsSync(dbPath) ? 'YES' : 'NO'}`);
console.log('');

const db = new Database(dbPath, { readonly: true });
db.pragma('foreign_keys = ON');

try {
  // 1. Total patient count
  console.log('=== PATIENT DATA ===');
  const totalPatients = db.prepare('SELECT COUNT(*) as count FROM patients').get();
  console.log(`Total Patients: ${totalPatients.count}`);

  // 2. Gender breakdown
  const genderBreakdown = db.prepare(`
    SELECT gender, COUNT(*) as count 
    FROM patients 
    GROUP BY gender
  `).all();
  console.log(`\nGender Breakdown:`);
  genderBreakdown.forEach(row => {
    const genderName = row.gender === 'm' ? 'Male' : row.gender === 'f' ? 'Female' : row.gender;
    console.log(`  ${genderName}: ${row.count}`);
  });

  // 3. All patient IDs
  console.log(`\nAll Patient IDs (${totalPatients.count} total):`);
  const allPatients = db.prepare('SELECT subject_id FROM patients ORDER BY subject_id').all();
  console.log(`  Total from query: ${allPatients.length}`);
  console.log(`  Sample IDs: ${allPatients.slice(0, 10).map(p => p.subject_id).join(', ')}...`);

  // 4. Male patients
  console.log(`\nMale Patients:`);
  const malePatients = db.prepare(`
    SELECT subject_id FROM patients 
    WHERE gender = 'm' 
    ORDER BY subject_id
  `).all();
  console.log(`  Total: ${malePatients.length}`);
  console.log(`  IDs: ${malePatients.map(p => p.subject_id).join(', ')}`);

  // 5. Female patients
  console.log(`\nFemale Patients:`);
  const femalePatients = db.prepare(`
    SELECT subject_id FROM patients 
    WHERE gender = 'f' 
    ORDER BY subject_id
  `).all();
  console.log(`  Total: ${femalePatients.length}`);
  console.log(`  IDs: ${femalePatients.map(p => p.subject_id).join(', ')}`);

  // 6. Check admissions
  console.log(`\n=== ADMISSIONS ===`);
  const admissionCount = db.prepare('SELECT COUNT(*) as count FROM admissions').get();
  console.log(`Total Admissions: ${admissionCount.count}`);

  // 7. Check if any admission queries work
  console.log(`\n=== DATABASE VALIDATION ===`);
  console.log(`Database Tables:`);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  tables.forEach(t => {
    const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
    console.log(`  ${t.name}: ${rowCount.count} rows`);
  });

  // 8. Test problematic queries from chat API
  console.log(`\n=== TESTING CHAT QUERIES ===`);
  
  // Query 1: All patient IDs (should return 100)
  console.log(`\nQuery 1: All patient IDs`);
  const q1 = db.prepare('SELECT subject_id FROM patients ORDER BY subject_id').all();
  console.log(`  Result count: ${q1.length}`);
  console.log(`  Expected: 100`);
  console.log(`  Status: ${q1.length === 100 ? '✅ PASS' : '❌ FAIL'}`);

  // Query 2: Male patient IDs
  console.log(`\nQuery 2: Male patient IDs`);
  const q2 = db.prepare("SELECT subject_id FROM patients WHERE gender = 'm' ORDER BY subject_id").all();
  console.log(`  Result count: ${q2.length}`);
  console.log(`  Gender breakdown shows: ${genderBreakdown.find(g => g.gender === 'm')?.count || 0} males`);
  console.log(`  Status: ${q2.length === genderBreakdown.find(g => g.gender === 'm')?.count ? '✅ PASS' : '❌ FAIL'}`);

  // Query 3: Female patient IDs
  console.log(`\nQuery 3: Female patient IDs`);
  const q3 = db.prepare("SELECT subject_id FROM patients WHERE gender = 'f' ORDER BY subject_id").all();
  console.log(`  Result count: ${q3.length}`);
  console.log(`  Gender breakdown shows: ${genderBreakdown.find(g => g.gender === 'f')?.count || 0} females`);
  console.log(`  Status: ${q3.length === genderBreakdown.find(g => g.gender === 'f')?.count ? '✅ PASS' : '❌ FAIL'}`);

  // Test the default fallback query
  console.log(`\nQuery 4: Gender statistics (DEFAULT FALLBACK)`);
  const q4 = db.prepare(`
    SELECT COUNT(*) as total_patients, 
           SUM(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) as male_count, 
           SUM(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) as female_count 
    FROM patients
  `).all();
  console.log(`  Result: ${JSON.stringify(q4[0])}`);

  console.log(`\n✅ Database investigation complete`);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
} finally {
  db.close();
}
