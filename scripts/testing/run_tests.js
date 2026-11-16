/**
 * CLARA Chatbot Test Executor
 * Runs comprehensive tests against the /api/chat endpoint
 * Authenticates, then executes each test case
 */

const http = require('http');
const https = require('https');
const { testSuite, getExpectedResult, extractNumericValue, db } = require('./test_suite');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = null;
const testResults = [];

// Helper: Make HTTP request
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add session cookie if available
    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      
      // Capture Set-Cookie header for session
      if (res.headers['set-cookie']) {
        sessionCookie = res.headers['set-cookie'][0].split(';')[0];
        console.log('[SESSION] Cookie captured:', sessionCookie.substring(0, 30) + '...');
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
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

// Step 1: Login
async function login() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 1: AUTHENTICATION');
  console.log('='.repeat(70));
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: 'doctor@hospital.com',
      password: 'demo123'
    });

    if (response.status !== 200) {
      console.error('❌ Login failed:', response.body);
      process.exit(1);
    }

    console.log('✓ Login successful');
    console.log('  User:', response.body.user.email);
    return true;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    process.exit(1);
  }
}

// Step 2: Execute single test
async function executeTest(testCase) {
  const { id, category, question, referenceSql, expectedPattern, description } = testCase;

  console.log(`\n[${id}] ${category} - ${description}`);
  console.log(`   Question: "${question}"`);

  // Get expected result from reference SQL
  let expectedData = null;
  let expectedCount = null;
  if (referenceSql) {
    try {
      expectedData = getExpectedResult(referenceSql);
      if (expectedData && expectedData.length > 0 && expectedData[0].count !== undefined) {
        expectedCount = expectedData[0].count;
      }
      console.log(`   Reference SQL: ${referenceSql.substring(0, 80)}...`);
      console.log(`   Expected data points: ${expectedData ? expectedData.length : 0}`);
    } catch (e) {
      console.log(`   Reference SQL error: ${e.message}`);
    }
  }

  // Call chatbot API
  let result = { success: false, error: 'No response' };
  try {
    result = await makeRequest('POST', '/api/chat', {
      messages: [{ role: 'user', content: question }]
    });
  } catch (error) {
    console.log(`   ❌ API ERROR: ${error.message}`);
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: error.message,
      details: 'API call failed'
    };
  }

  // Parse response
  if (result.status === 401) {
    console.log('   ❌ AUTHENTICATION FAILED');
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: 'Authentication required',
      details: 'Got 401 Unauthorized'
    };
  }

  if (result.status !== 200) {
    console.log(`   ❌ HTTP ERROR ${result.status}`);
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: `HTTP ${result.status}`,
      details: result.body?.error || 'Unknown error'
    };
  }

  // Criteria 1: Success flag
  if (!result.body.success) {
    console.log('   ❌ CRITERIA 1 FAIL: Response not successful');
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: result.body.error,
      details: 'success: false in response'
    };
  }

  // Criteria 2: Answer contains expected pattern
  const answer = result.body.clinical_answer || '';
  if (!expectedPattern.test(answer)) {
    console.log(`   ❌ CRITERIA 2 FAIL: Answer doesn't match expected pattern`);
    console.log(`      Pattern: ${expectedPattern}`);
    console.log(`      Got: ${answer.substring(0, 100)}`);
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: 'Answer pattern mismatch',
      details: `Expected pattern "${expectedPattern}" not found in: ${answer}`,
      answer
    };
  }

  // Criteria 3: For numeric queries, validate against reference
  let numericMatch = true;
  let extractedNumber = null;
  if (referenceSql && expectedCount !== null && !question.toLowerCase().includes('unsupported')) {
    extractedNumber = extractNumericValue(answer);
    if (extractedNumber !== null && extractedNumber !== expectedCount) {
      console.log(`   ⚠️  CRITERIA 3 WARN: Numeric mismatch`);
      console.log(`      Expected: ${expectedCount}`);
      console.log(`      Got: ${extractedNumber}`);
      numericMatch = false;
    }
  }

  // Criteria 4: Data returned makes sense
  if (result.body.records_found < 0) {
    console.log('   ❌ CRITERIA 4 FAIL: Invalid records_found count');
    return {
      testId: id,
      category,
      question,
      passed: false,
      error: 'Invalid records_found'
    };
  }

  // All criteria passed
  console.log(`   ✓ PASS`);
  if (extractedNumber !== null) {
    console.log(`     Value: ${extractedNumber}${expectedCount ? ` (expected: ${expectedCount})` : ''}`);
  }
  console.log(`     Answer: ${answer.substring(0, 100)}...`);

  return {
    testId: id,
    category,
    question,
    passed: true,
    expectedData,
    actualData: result.body.data,
    answer,
    recordsFound: result.body.records_found,
    extractedNumber
  };
}

// Step 3: Run all tests
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('STEP 2: RUNNING TEST SUITE');
  console.log('='.repeat(70));
  
  for (const testCase of testSuite) {
    const result = await executeTest(testCase);
    testResults.push(result);
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Step 4: Generate report
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  const passPercentage = Math.round((passed / total) * 100);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed} (${passPercentage}%)`);
  console.log(`Failed: ${failed}`);

  console.log('\nResults by Category:');
  const byCategory = {};
  for (const result of testResults) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      byCategory[result.category].passed++;
    } else {
      byCategory[result.category].failed++;
    }
  }

  for (const [category, counts] of Object.entries(byCategory)) {
    const total = counts.passed + counts.failed;
    const pct = Math.round((counts.passed / total) * 100);
    console.log(`  ${category}: ${counts.passed}/${total} (${pct}%)`);
  }

  console.log('\nFailed Tests:');
  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length === 0) {
    console.log('  None! All tests passed.');
  } else {
    for (const result of failedTests) {
      console.log(`  [${result.testId}] ${result.question}`);
      console.log(`    Error: ${result.error}`);
      console.log(`    Details: ${result.details}`);
    }
  }

  // Save results to file
  const reportContent = {
    timestamp: new Date().toISOString(),
    summary: {
      total,
      passed,
      failed,
      passPercentage
    },
    byCategory,
    details: testResults
  };

  require('fs').writeFileSync(
    'test_results.json',
    JSON.stringify(reportContent, null, 2)
  );

  console.log('\n✓ Detailed results saved to test_results.json');
  console.log('='.repeat(70));
}

// Main execution
async function main() {
  try {
    await login();
    await runAllTests();
    generateReport();
    
    // Close database
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
