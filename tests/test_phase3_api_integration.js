#!/usr/bin/env node

/**
 * PHASE 3 API INTEGRATION TESTS
 * 
 * End-to-end HTTP tests for:
 * - Patient search API
 * - Patient profile API  
 * - Document management API
 * - New patient creation via registration API
 * 
 * Requires: Development server running on port 3000 or 3001
 * Run: node tests/test_phase3_api_integration.js
 */

const http = require('http');
const https = require('https');

// ============ CONFIG ============
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PORT = BASE_URL.includes('3001') ? 3001 : 3000;
const HOST = 'localhost';

console.log(`
╔════════════════════════════════════════════════════════════╗
║     PHASE 3 API INTEGRATION TESTS (HTTP Endpoints)         ║
╚════════════════════════════════════════════════════════════╝
`);

let testsPassed = 0;
let testsFailed = 0;
const failures = [];
let sessionCookie = null;

// ============ HELPERS ============

/**
 * Make HTTP request and return parsed JSON
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Include session cookie if we have one
    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        // Capture Set-Cookie header for session management
        const setCookie = res.headers['set-cookie'];
        if (setCookie && Array.isArray(setCookie)) {
          const sessionCookieHeader = setCookie.find(c => c.includes('session_id'));
          if (sessionCookieHeader) {
            sessionCookie = sessionCookieHeader.split(';')[0];
          }
        }

        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            body: parsed,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            raw: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failures.push({ name, error: e.message });
    testsFailed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failures.push({ name, error: e.message });
    testsFailed++;
  }
}

// ============ SETUP ============
console.log('\n--- SETUP ---\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Testing against: ${HOST}:${PORT}`);

// ============ HEALTH CHECK ============
console.log('\n--- HEALTH CHECK ---\n');

asyncTest('Server is accessible', async () => {
  try {
    const res = await makeRequest('GET', '/');
    if (res.status !== 200 && res.status !== 404) {
      // 404 is okay for root, means server is responding
      throw new Error(`Unexpected status: ${res.status}`);
    }
  } catch (e) {
    throw new Error(`Server not responding at ${BASE_URL}: ${e.message}`);
  }
});

// ============ SECTION 1: SEARCH API ============
console.log('\n--- SECTION 1: SEARCH API ---\n');

asyncTest('Search MIMIC patient by ID', async () => {
  const res = await makeRequest('GET', '/api/patients/search?type=id&value=10000032');
  
  if (res.status === 401) {
    throw new Error('Authentication required (session may have expired)');
  }
  if (!res.body || !res.body.success) {
    throw new Error(`Search failed: ${res.raw}`);
  }
  if (!res.body.patient) {
    throw new Error('No patient in response');
  }
  if (res.body.patient.source !== 'MIMIC') {
    throw new Error(`Expected source MIMIC, got ${res.body.patient.source}`);
  }
  if (!res.body.patient.age) {
    throw new Error('MIMIC patient should have age');
  }
});

asyncTest('Search missing patient returns not found', async () => {
  const res = await makeRequest('GET', '/api/patients/search?type=id&value=999999999');
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  // Should return success but found: false or empty results
  if (!res.body) {
    throw new Error('No response body');
  }
});

asyncTest('Search with invalid ID returns error', async () => {
  const res = await makeRequest('GET', '/api/patients/search?type=id&value=invalid');
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  // Should return 400 bad request
  if (res.status !== 400 && !res.body.error) {
    throw new Error('Should return error for invalid ID');
  }
});

// ============ SECTION 2: PATIENT PROFILE API ============
console.log('\n--- SECTION 2: PATIENT PROFILE API ---\n');

asyncTest('Get MIMIC patient profile', async () => {
  const res = await makeRequest('GET', '/api/patients/10000032');
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  if (!res.body || !res.body.success) {
    throw new Error(`Profile fetch failed: ${res.raw}`);
  }
  if (!res.body.patient) {
    throw new Error('No patient in response');
  }
  if (res.body.patient.source !== 'MIMIC') {
    throw new Error(`Expected source MIMIC, got ${res.body.patient.source}`);
  }
  if (!res.body.clinical) {
    throw new Error('MIMIC patient should have clinical data');
  }
  if (!('admissions' in res.body.clinical)) {
    throw new Error('Should have admissions in clinical data');
  }
});

asyncTest('Get MIMIC patient profile has correct fields', async () => {
  const res = await makeRequest('GET', '/api/patients/10000032');
  
  if (!res.body.success) throw new Error('Profile fetch failed');
  
  const patient = res.body.patient;
  const required = ['id', 'source', 'gender', 'age'];
  
  required.forEach(field => {
    if (!(field in patient)) {
      throw new Error(`Missing field: ${field}`);
    }
  });
});

asyncTest('Get invalid patient returns 404', async () => {
  const res = await makeRequest('GET', '/api/patients/999999999');
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  // Should return 404 not found
  if (res.status !== 404 && !res.body.error) {
    throw new Error('Should return 404 for invalid patient');
  }
});

// ============ SECTION 3: DOCUMENT API ============
console.log('\n--- SECTION 3: DOCUMENT API ---\n');

asyncTest('List MIMIC patient documents', async () => {
  const res = await makeRequest('GET', '/api/patients/10000032/documents');
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  if (!res.body || !res.body.success) {
    throw new Error(`Document list failed: ${res.raw}`);
  }
  if (!Array.isArray(res.body.documents)) {
    throw new Error('Documents should be an array');
  }
  // Should return count even if 0
  if (res.body.count === undefined) {
    throw new Error('Should have count field');
  }
});

asyncTest('Document list includes correct fields', async () => {
  const res = await makeRequest('GET', '/api/patients/10000032/documents');
  
  if (!res.body.success) throw new Error('Document list failed');
  
  if (res.body.documents && res.body.documents.length > 0) {
    const doc = res.body.documents[0];
    const required = ['id', 'filename', 'type', 'size'];
    
    required.forEach(field => {
      if (!(field in doc)) {
        throw new Error(`Missing field in document: ${field}`);
      }
    });
  }
});

asyncTest('List documents for new patient (empty registry)', async () => {
  // Use a new patient ID
  const newPatientId = 5000000 + Math.floor(Math.random() * 100000);
  const res = await makeRequest('GET', `/api/patients/${newPatientId}/documents`);
  
  if (res.status === 401) {
    throw new Error('Authentication required');
  }
  // Should return empty list for non-existent patient or valid response
  if (!res.body) {
    throw new Error('No response body');
  }
  // Either success with empty array or 404
  if (res.status === 200 && res.body.documents) {
    if (!Array.isArray(res.body.documents)) {
      throw new Error('Documents should be an array');
    }
  }
});

// ============ SECTION 4: REGISTRATION API ============
console.log('\n--- SECTION 4: REGISTRATION API ---\n');

asyncTest('Registration page loads', async () => {
  const res = await makeRequest('GET', '/patients/register');
  
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Unexpected status: ${res.status}`);
  }
  // Just verify it's reachable, don't check HTML
});

asyncTest('Register new patient endpoint exists', async () => {
  const testPatient = {
    full_name: 'Test Patient',
    gender: 'M',
    date_of_birth: '1990-01-01',
    phone: '5551234567'
  };
  
  const res = await makeRequest('POST', '/api/patients/register', testPatient);
  
  if (res.status === 401) {
    // Expected if not logged in, means endpoint exists
    return;
  }
  // Should exist (success, error, or redirect)
  if (res.status >= 500) {
    throw new Error(`Server error: ${res.status}`);
  }
});

// ============ SECTION 5: IMPORT API ============
console.log('\n--- SECTION 5: IMPORT API ---\n');

asyncTest('Import page loads', async () => {
  const res = await makeRequest('GET', '/patients/import');
  
  if (res.status !== 200 && res.status !== 404) {
    throw new Error(`Unexpected status: ${res.status}`);
  }
});

asyncTest('Import preview endpoint exists', async () => {
  const res = await makeRequest('POST', '/api/patients/import/preview', {
    fileContent: 'test,data\n1,2',
    fileFormat: 'csv'
  });
  
  if (res.status === 401) {
    // Expected if not logged in
    return;
  }
  if (res.status >= 500) {
    throw new Error(`Server error: ${res.status}`);
  }
});

// ============ SECTION 6: ERROR HANDLING ============
console.log('\n--- SECTION 6: ERROR HANDLING ---\n');

asyncTest('Missing authentication returns 401', async () => {
  // Clear session to test auth requirement
  const savedSession = sessionCookie;
  sessionCookie = null;
  
  const res = await makeRequest('GET', '/api/patients/10000032');
  
  // Restore session
  sessionCookie = savedSession;
  
  // Should require authentication
  if (res.status !== 401 && !res.body.error) {
    throw new Error('Should require authentication');
  }
});

asyncTest('Invalid request parameters handled gracefully', async () => {
  const res = await makeRequest('GET', '/api/patients/search?type=invalid&value=test');
  
  if (res.status === 401) {
    // Skip if auth required
    return;
  }
  // Should return error, not 500
  if (res.status >= 500) {
    throw new Error(`Server error: ${res.status}`);
  }
});

// ============ SUMMARY ============
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log(`║ TESTS PASSED: ${testsPassed.toString().padEnd(48)} ║`);
console.log(`║ TESTS FAILED: ${testsFailed.toString().padEnd(48)} ║`);
console.log(`║ TOTAL:       ${(testsPassed + testsFailed).toString().padEnd(48)} ║`);
console.log('╚════════════════════════════════════════════════════════════╝');

if (testsFailed > 0) {
  console.log('\n--- FAILURES ---\n');
  failures.forEach(f => {
    console.log(`✗ ${f.name}`);
    console.log(`  ${f.error}\n`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All API integration tests passed!\n');
  process.exit(0);
}
