#!/usr/bin/env node
/**
 * Phase 10 Chatbot Response Testing - Updated
 * Tests the UPDATED chatbot responses for patient ID queries
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'database', 'clara.db');

const db = new Database(dbPath, { readonly: true });
db.pragma('foreign_keys = ON');

// UPDATED functions with PHASE 10 fixes
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
  
  // Patient queries - PHASE 10 FIX: Remove LIMIT for all-records queries
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
  
  // Default
  return "SELECT COUNT(*) as total_patients, SUM(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) as male_count, SUM(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) as female_count FROM patients";
}

function generateAnswerFromData(userMessage, recordCount, data) {
  const msg = userMessage.toLowerCase();
  
  const wantsAllRecords = msg.includes('all ') || msg.includes('every') || msg.includes('complete') || 
                         msg.includes('list ') || msg.includes(' ids') || msg.includes('full list') ||
                         msg.includes('show all') || msg.includes('give me all');
  
  // Female patient queries - COMPLETE LIST
  if (msg.includes('female') && msg.includes('patient') && !msg.includes('only male') && !msg.match(/\bmale\b/) && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      if (wantsAllRecords || msg.includes('list') || msg.includes(' ids')) {
        const allIds = data.map(p => p.subject_id).join(', ');
        return `All ${recordCount} female patient IDs: ${allIds}`;
      } else {
        const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
        return `Found ${recordCount} female patients matching your criteria. Examples: ${patients}.`;
      }
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} female patients in the database.`;
    }
  }
  
  // Male patient queries - COMPLETE LIST
  if (msg.includes('male') && msg.includes('patient') && !msg.includes('female') && !msg.includes('compare')) {
    if (data[0]?.subject_id) {
      if (wantsAllRecords || msg.includes('list') || msg.includes(' ids')) {
        const allIds = data.map(p => p.subject_id).join(', ');
        return `All ${recordCount} male patient IDs: ${allIds}`;
      } else {
        const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
        return `Found ${recordCount} male patients matching your criteria. Examples: ${patients}.`;
      }
    } else {
      const count = data[0]?.count || 0;
      return `There are ${count} male patients in the database.`;
    }
  }
  
  // Total patient count - COMPLETE LIST
  if ((msg.includes('how many') || msg.includes('total') || msg.includes('count')) && msg.includes('patient') && !msg.includes('male') && !msg.includes('female') && !msg.includes('gender')) {
    const count = data[0]?.count || 0;
    if (wantsAllRecords && data[0]?.subject_id) {
      const allIds = data.map(p => p.subject_id).join(', ');
      return `The database contains ${count} unique patients. All patient IDs: ${allIds}`;
    }
    return `The database contains ${count} unique patients.`;
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
  
  return `The database query returned ${recordCount} records.`;
}

console.log(`📊 PHASE 10 CHATBOT RESPONSE TESTING - UPDATED\n`);

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
  ];

  let testNum = 1;
  for (const question of testQueries) {
    console.log(`\nTest ${testNum}: "${question}"`);
    
    try {
      const sql = generateSQLWithPatterns(question);
      const stmt = db.prepare(sql);
      const results = stmt.all();
      
      const answer = generateAnswerFromData(question, results.length, results);
      
      console.log(`  SQL: ${sql.substring(0, 80)}${sql.length > 80 ? '...' : ''}`);
      console.log(`  Results: ${results.length}`);
      console.log(`  Answer: ${answer.substring(0, 100)}${answer.length > 100 ? '...' : ''}`);
      
      // Verify
      if (sql.includes('LIMIT')) {
        console.log(`  ⚠️  SQL has LIMIT`);
      } else {
        console.log(`  ✅ No LIMIT`);
      }
      
      if ((question.toLowerCase().includes('all') || question.toLowerCase().includes('list')) && 
          results.length < 50) {
        console.log(`  ⚠️  Expected more results (got ${results.length})`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    testNum++;
  }

  console.log(`\n✅ Test complete\n`);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
} finally {
  db.close();
}
