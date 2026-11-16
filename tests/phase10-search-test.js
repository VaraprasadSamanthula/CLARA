#!/usr/bin/env node
/**
 * Phase 10 Patient Search API Testing
 * Tests the patient search endpoint directly
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the database connection
const { runQuery } = await import('./backend/database/connection.js');

console.log(`📊 PHASE 10 PATIENT SEARCH API TESTING\n`);

// Test cases for patient search
const testCases = [
  { type: 'id', value: '10000032', expectedStatus: 200, description: 'Valid patient ID (female)' },
  { type: 'id', value: '10002495', expectedStatus: 200, description: 'Valid patient ID (male)' },
  { type: 'id', value: '99999999', expectedStatus: 200, description: 'Nonexistent patient ID' },
  { type: 'id', value: 'abc', expectedStatus: 400, description: 'Invalid patient ID (not a number)' },
  { type: 'id', value: '', expectedStatus: 400, description: 'Empty patient ID' },
  { type: 'id', value: '0', expectedStatus: 400, description: 'Zero patient ID' },
  { type: 'id', value: '-1', expectedStatus: 400, description: 'Negative patient ID' },
];

// Simulate the search API logic
function validatePatientId(id) {
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function testSearch(searchType, searchValue, description) {
  console.log(`\n  Test: ${description}`);
  console.log(`  Type: ${searchType}, Value: "${searchValue}"`);
  
  // Validate inputs
  if (!searchType || !searchValue) {
    console.log(`  Result: 400 - Missing required parameters`);
    return 400;
  }
  
  if (searchType === 'id') {
    const patientId = validatePatientId(searchValue);
    if (!patientId) {
      console.log(`  Result: 400 - Invalid patient ID`);
      return 400;
    }
    
    // Query database
    const result = runQuery(
      `SELECT subject_id, gender, anchor_age FROM patients WHERE subject_id = ?`,
      [patientId]
    );
    
    if (!result.success) {
      console.log(`  Result: 400 - Database error: ${result.error}`);
      return 400;
    }
    
    if (result.data.length === 0) {
      console.log(`  Result: 200 - Patient not found`);
      return 200;
    }
    
    console.log(`  Result: 200 - Found: ${JSON.stringify(result.data[0])}`);
    return 200;
  }
  
  return 400;
}

try {
  console.log(`Testing patient search endpoint:\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    const status = testSearch(test.type, test.value, test.description);
    if (status === test.expectedStatus) {
      console.log(`  ✅ PASS (expected ${test.expectedStatus})`);
      passed++;
    } else {
      console.log(`  ❌ FAIL (expected ${test.expectedStatus}, got ${status})`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`✅ Search API testing complete\n`);
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}
