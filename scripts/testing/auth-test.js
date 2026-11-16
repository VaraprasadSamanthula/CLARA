/**
 * Authentication Security Testing Script
 * Tests 4 scenarios to identify vulnerabilities
 */

const http = require('http');

function makeRequest(testName, options) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${testName}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 100)}...`);
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      console.log(`\n${testName}`);
      console.log(`Error: ${error.message}`);
      resolve(0);
    });

    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('AUTHENTICATION SECURITY TESTS');
  console.log('='.repeat(60));

  const results = {};

  // Test 1: No authentication cookie
  console.log('\n[TEST 1] No Authentication Cookie');
  console.log('-'.repeat(40));
  results.test1 = await makeRequest('No auth cookie', {
    hostname: 'localhost',
    port: 3000,
    path: '/api/patients/search?type=id&value=10027602',
    method: 'GET',
    headers: {}
  });

  // Test 2: Valid auth cookie (auth=true)
  console.log('\n[TEST 2] Valid Auth Cookie (auth=true)');
  console.log('-'.repeat(40));
  results.test2 = await makeRequest('auth=true', {
    hostname: 'localhost',
    port: 3000,
    path: '/api/patients/search?type=id&value=10027602',
    method: 'GET',
    headers: {
      'Cookie': 'auth=true'
    }
  });

  // Test 3: Invalid auth cookie (auth=false) - VULNERABILITY TEST
  console.log('\n[TEST 3] Invalid Auth Cookie (auth=false)');
  console.log('-'.repeat(40));
  console.log('SECURITY TEST: Should be 401, but if 200 = VULNERABLE');
  results.test3 = await makeRequest('auth=false', {
    hostname: 'localhost',
    port: 3000,
    path: '/api/patients/search?type=id&value=10027602',
    method: 'GET',
    headers: {
      'Cookie': 'auth=false'
    }
  });

  // Test 4: Forged auth cookie - VULNERABILITY TEST
  console.log('\n[TEST 4] Forged Auth Cookie (auth=random-value)');
  console.log('-'.repeat(40));
  console.log('SECURITY TEST: Should be 401, but if 200 = VULNERABLE');
  results.test4 = await makeRequest('auth=random-value', {
    hostname: 'localhost',
    port: 3000,
    path: '/api/patients/search?type=id&value=10027602',
    method: 'GET',
    headers: {
      'Cookie': 'auth=random-value'
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Test 1 (No auth):      ${results.test1} (Expected: 401) ${results.test1 === 401 ? '✓' : '✗'}`);
  console.log(`Test 2 (auth=true):    ${results.test2} (Expected: 200) ${results.test2 === 200 ? '✓' : '✗'}`);
  console.log(`Test 3 (auth=false):   ${results.test3} (Expected: 401) ${results.test3 === 401 ? '✓' : '✗'}`);
  console.log(`Test 4 (auth=random):  ${results.test4} (Expected: 401) ${results.test4 === 401 ? '✓' : '✗'}`);

  console.log('\n' + '='.repeat(60));
  console.log('VULNERABILITY ASSESSMENT');
  console.log('='.repeat(60));

  const isVulnerable = results.test3 === 200 || results.test4 === 200;
  if (isVulnerable) {
    console.log('🔴 VULNERABLE: Authentication bypass detected!');
    console.log('\nIssue: verifyAuth() only checks if auth cookie EXISTS');
    console.log('       It does NOT validate the value.');
    console.log('\nWhy this matters:');
    console.log('  - Attacker can set auth=anything');
    console.log('  - auth=false still grants access');
    console.log('  - No actual authentication happening');
    console.log('\nVulnerability Details:');
    console.log('  Function: verifyAuth() in route.js');
    console.log('  Line: return !!authCookie;  (just checks existence)');
    if (results.test3 === 200) console.log('  Evidence: auth=false returns 200 (PASS)');
    if (results.test4 === 200) console.log('  Evidence: auth=random returns 200 (PASS)');
  } else {
    console.log('✅ SECURE: Cookie value validation appears to work');
  }
}

runTests().catch(console.error);
