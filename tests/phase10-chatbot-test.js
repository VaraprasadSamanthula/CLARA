#!/usr/bin/env node
/**
 * Phase 10 Chatbot Response Testing
 * Tests the actual chatbot responses for patient ID queries
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the SQL generation and answer functions from the chat API
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'database', 'clara.db');

const db = new Database(dbPath, { readonly: true });
db.pragma('foreign_keys = ON');

// Copy the functions from the chat API route for testing
function detectGenderContext(msg) {
  const hasFemale = /\b(female|woman|women)\b/.test(msg);
  const hasMale = /\b(male|man|men)\b/.test(msg);
  const hasPatientContext = msg.includes('patient') || msg.includes('find') || msg.includes('show') || msg.includes('list');
  
  const comparingBoth = (hasFemale && hasMale) && (msg.includes('both') || msg.includes('compare') || msg.includes('versus') || msg.includes(' vs ') || (msg.includes('and') && !msg.match(/only.*female|only.*male|just.*female|just.*male/)));
  
  if (comparingBoth) {
    return 'both';
  } else if (hasFemale && hasPatientContext) {
    return 'female';
  } else if (hasMale && hasPatientContext) {
    return 'male';
  }
  return null;
}

function buildPatientConditions(msg) {
  let conditions = [];
  
  const genderContext = detectGenderContext(msg);
  if (genderContext === 'female') {
    conditions.push("gender = 'f'");
  } else if (genderContext === 'male') {
    conditions.push("gender = 'm'");
  }
  
  return conditions;
}

function generateSQLWithPatterns(userMessage) {
  const msg = userMessage.toLowerCase();
  
  console.log(`[SQL] Analyzing: ${msg}`);
  
  // DML rejection
  const dmlKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate'];
  for (const keyword of dmlKeywords) {
    if (msg.includes(keyword)) {
      throw new Error(`Database modifications are not permitted. "${keyword}" statements are not allowed.`);
    }
  }
  
  let isCountQuery = msg.includes('how many') || msg.includes('total') || msg.includes('count');
  
  // Gender breakdown
  const genderContext = detectGenderContext(msg);
  if ((genderContext === 'both' && isCountQuery) || (msg.includes('compare') && msg.includes('male') && msg.includes('female'))) {
    return "SELECT 'male' as gender, COUNT(*) as count FROM patients WHERE gender = 'm' UNION SELECT 'female' as gender, COUNT(*) as count FROM patients WHERE gender = 'f'";
  }
  
  // Patient queries
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
      // THIS IS THE ISSUE: For patient ID queries, what SQL is generated?
      if (conditions.length > 0) {
        const where = conditions.join(' AND ');
        return `SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients WHERE ${where} LIMIT 20`;
      }
      return "SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients LIMIT 20";
    }
  }
  
  // Default
  return "SELECT COUNT(*) as total_patients, SUM(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) as male_count, SUM(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) as female_count FROM patients";
}

function generateAnswerFromData(userMessage, recordCount, data) {
  const msg = userMessage.toLowerCase();
  
  // Female patient queries
  if (msg.includes('female') && msg.includes('patient') && !msg.includes('only male') && !msg.match(/\bmale\b/) && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
      return `Found ${recordCount} female patients matching your criteria. Examples: ${patients}.`;
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} female patients in the database with detailed clinical information.`;
    }
  }
  
  // Male patient queries
  if (msg.includes('male') && msg.includes('patient') && !msg.includes('female') && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
      return `Found ${recordCount} male patients matching your criteria. Examples: ${patients}.`;
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} male patients in the database with comprehensive medical histories.`;
    }
  }
  
  // Total patient count
  if ((msg.includes('how many') || msg.includes('total') || msg.includes('count')) && msg.includes('patient') && !msg.includes('male') && !msg.includes('female') && !msg.includes('gender')) {
    const count = data[0]?.count || 0;
    return `The database contains ${count} unique patients with comprehensive clinical documentation.`;
  }
  
  return `The database query returned ${recordCount} records with detailed clinical information available for further analysis.`;
}

console.log(`📊 PHASE 10 CHATBOT RESPONSE TESTING\n`);

try {
  const testQueries = [
    "Show all patient IDs",
    "Give me all patient IDs in the database",
    "List all male patient IDs",
    "List all female patient IDs",
    "How many male patients are there?",
    "How many female patients are there?",
    "Show the total patient count",
    "Show gender-wise patient counts",
    "Show all male and female patient IDs separately",
  ];

  let testNum = 1;
  for (const question of testQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Test ${testNum}: "${question}"`);
    console.log('='.repeat(80));
    
    try {
      // Generate SQL
      const sql = generateSQLWithPatterns(question);
      console.log(`\n[SQL GENERATED]: ${sql}`);
      
      // Execute query
      const stmt = db.prepare(sql);
      const results = stmt.all();
      
      console.log(`\n[DATABASE RESULTS]: ${results.length} rows returned`);
      if (results.length > 0) {
        if (results.length <= 10) {
          results.forEach((row, idx) => {
            console.log(`  Row ${idx + 1}: ${JSON.stringify(row)}`);
          });
        } else {
          console.log(`  First 5 rows:`);
          results.slice(0, 5).forEach((row, idx) => {
            console.log(`    Row ${idx + 1}: ${JSON.stringify(row)}`);
          });
          console.log(`  ... (${results.length - 5} more rows)`);
          console.log(`  Last row: ${JSON.stringify(results[results.length - 1])}`);
        }
      }
      
      // Generate answer
      const answer = generateAnswerFromData(question, results.length, results);
      console.log(`\n[CHATBOT ANSWER]: ${answer}`);
      
      // Verify count
      console.log(`\n[ANALYSIS]:`);
      if (sql.toLowerCase().includes('limit')) {
        console.log(`  ⚠️  SQL contains LIMIT clause - results may be truncated!`);
      }
      if (results.length > 0 && results[0].subject_id) {
        console.log(`  ✅ Query returns patient IDs (subject_id field present)`);
        console.log(`  Count from query: ${results.length}`);
      } else if (results.length > 0 && results[0].count !== undefined) {
        console.log(`  ✅ Query returns count`);
        console.log(`  Count value: ${results[0].count}`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    testNum++;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n✅ Test complete\n`);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
} finally {
  db.close();
}
