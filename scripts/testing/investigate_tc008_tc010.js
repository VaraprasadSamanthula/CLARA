/**
 * Investigation of TC_008 and TC_010
 * Execute reference SQL directly and compare with actual results
 */

const Database = require('better-sqlite3');
const db = new Database('clara.db');

console.log('='.repeat(70));
console.log('INVESTIGATION: TC_008 and TC_010');
console.log('='.repeat(70));

// TC_008: "How many patients are older than 60?"
console.log('\nTC_008: "How many patients are older than 60?"');
console.log('-'.repeat(70));

const tc008_sql = 'SELECT COUNT(*) as count FROM patients WHERE anchor_age > 60';
console.log(`Reference SQL: ${tc008_sql}`);

const tc008_result = db.prepare(tc008_sql).get();
console.log(`Result: ${tc008_result.count} patients`);

// Get breakdown by age for context
const tc008_breakdown = db.prepare(`
  SELECT anchor_age, COUNT(*) as count 
  FROM patients 
  WHERE anchor_age >= 60 
  ORDER BY anchor_age DESC
`).all();

console.log('\nPatients at age >= 60 (for context):');
let total_60_plus = 0;
tc008_breakdown.forEach(row => {
  console.log(`  Age ${row.anchor_age}: ${row.count} patients`);
  total_60_plus += row.count;
});
console.log(`Total at age >= 60: ${total_60_plus}`);

// Now check > 60 (not including 60)
const tc008_greater = db.prepare(`
  SELECT anchor_age, COUNT(*) as count 
  FROM patients 
  WHERE anchor_age > 60 
  ORDER BY anchor_age DESC
`).all();

console.log('\nPatients at age > 60 (excluding exactly 60):');
let total_gt_60 = 0;
tc008_greater.forEach(row => {
  console.log(`  Age ${row.anchor_age}: ${row.count} patients`);
  total_gt_60 += row.count;
});
console.log(`Total at age > 60: ${total_gt_60}`);

// Check if there are patients exactly at age 60
const at_60 = db.prepare('SELECT COUNT(*) as count FROM patients WHERE anchor_age = 60').get();
console.log(`\nPatients at exactly age 60: ${at_60.count}`);

console.log('\n' + '='.repeat(70));

// TC_010: "How many patients are between 40 and 60 years old?"
console.log('\nTC_010: "How many patients are between 40 and 60 years old?"');
console.log('-'.repeat(70));

const tc010_sql = 'SELECT COUNT(*) as count FROM patients WHERE anchor_age >= 40 AND anchor_age <= 60';
console.log(`Reference SQL: ${tc010_sql}`);

const tc010_result = db.prepare(tc010_sql).get();
console.log(`Result: ${tc010_result.count} patients`);

// Get breakdown by age range
const tc010_breakdown = db.prepare(`
  SELECT anchor_age, COUNT(*) as count 
  FROM patients 
  WHERE anchor_age >= 40 AND anchor_age <= 60
  ORDER BY anchor_age
`).all();

console.log('\nPatients in age range 40-60 (inclusive):');
let total_40_60 = 0;
tc010_breakdown.forEach(row => {
  console.log(`  Age ${row.anchor_age}: ${row.count} patients`);
  total_40_60 += row.count;
});
console.log(`Total in range 40-60 (inclusive): ${total_40_60}`);

// Verify boundaries
const under_40 = db.prepare('SELECT COUNT(*) as count FROM patients WHERE anchor_age < 40').get();
const above_60 = db.prepare('SELECT COUNT(*) as count FROM patients WHERE anchor_age > 60').get();

console.log(`\nBoundary verification:`);
console.log(`  Patients < 40: ${under_40.count}`);
console.log(`  Patients 40-60 (inclusive): ${tc010_result.count}`);
console.log(`  Patients > 60: ${above_60.count}`);
console.log(`  Total: ${under_40.count + tc010_result.count + above_60.count}`);

// Get overall age distribution
console.log('\n' + '='.repeat(70));
console.log('Age Distribution (all patients):');
console.log('-'.repeat(70));

const age_dist = db.prepare(`
  SELECT 
    CASE 
      WHEN anchor_age < 30 THEN 'Under 30'
      WHEN anchor_age < 40 THEN '30-39'
      WHEN anchor_age < 50 THEN '40-49'
      WHEN anchor_age < 60 THEN '50-59'
      WHEN anchor_age < 70 THEN '60-69'
      WHEN anchor_age < 80 THEN '70-79'
      ELSE '80+'
    END as age_range,
    COUNT(*) as count
  FROM patients
  GROUP BY age_range
  ORDER BY age_range
`).all();

age_dist.forEach(row => {
  console.log(`  ${row.age_range}: ${row.count} patients`);
});

const total = db.prepare('SELECT COUNT(*) as count FROM patients').get();
console.log(`  Total: ${total.count} patients`);

db.close();
console.log('\n' + '='.repeat(70));
