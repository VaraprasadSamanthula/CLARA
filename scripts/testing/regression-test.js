/**
 * CLARA Chatbot Regression Test Suite
 * Tests the integration of the persistent clara.db with the chatbot API
 */

const http = require('http');

class RegressionTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Make HTTP POST request to chat API
   */
  async chatQuery(question) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        messages: [{ content: question, role: 'user' }]
      });

      const url = new URL(`${this.baseUrl}/api/chat`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Run a single test query
   */
  async runTest(testName, query, expectedMinCount = 0) {
    console.log(`\n[TEST] ${testName}`);
    console.log(`Query: "${query}"`);

    try {
      const response = await this.chatQuery(query);

      if (!response.success) {
        console.log(`  ✗ FAILED: ${response.error}`);
        this.failed++;
        this.results.push({ testName, status: 'FAILED', error: response.error });
        return false;
      }

      const recordCount = response.records_found || 0;
      console.log(`  Records found: ${recordCount}`);
      console.log(`  Answer: ${response.clinical_answer.substring(0, 100)}...`);

      if (recordCount >= expectedMinCount) {
        console.log(`  ✓ PASSED`);
        this.passed++;
        this.results.push({
          testName,
          status: 'PASSED',
          recordCount,
          sqlGenerated: response.sql || 'N/A'
        });
        return true;
      } else {
        console.log(`  ✗ FAILED: Expected at least ${expectedMinCount} records, got ${recordCount}`);
        this.failed++;
        this.results.push({
          testName,
          status: 'FAILED',
          error: `Expected ${expectedMinCount} records, got ${recordCount}`
        });
        return false;
      }
    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}`);
      this.failed++;
      this.results.push({ testName, status: 'ERROR', error: e.message });
      return false;
    }
  }

  /**
   * Run all regression tests
   */
  async runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     CLARA CHATBOT REGRESSION TEST SUITE                        ║');
    console.log('║   Testing Integration with Persistent clara.db                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Server: ${this.baseUrl}\n`);

    // Test 1: Basic patient count
    await this.runTest(
      'How many patients in database?',
      'How many patients?',
      1
    );

    // Test 2: Male patients
    await this.runTest(
      'Count male patients',
      'How many male patients?',
      0
    );

    // Test 3: Female patients
    await this.runTest(
      'Count female patients',
      'How many female patients?',
      0
    );

    // Test 4: Total admissions
    await this.runTest(
      'Total hospital admissions',
      'How many admissions?',
      1
    );

    // Test 5: Total prescriptions
    await this.runTest(
      'Total prescriptions count',
      'How many prescriptions?',
      1
    );

    // Test 6: Total lab measurements
    await this.runTest(
      'Total laboratory measurements',
      'How many laboratory measurements?',
      1
    );

    // Test 7: Total diagnoses
    await this.runTest(
      'Total diagnoses count',
      'How many diagnoses?',
      1
    );

    // Test 8: Top prescribed medications
    await this.runTest(
      'Most commonly prescribed medications',
      'What are the top 10 prescribed medications?',
      1
    );

    // Test 9: Age statistics
    await this.runTest(
      'Average patient age',
      'What is the average age of patients?',
      1
    );

    // Test 10: Admission types
    await this.runTest(
      'Types of hospital admissions',
      'What are the different types of admissions?',
      1
    );

    // Summary
    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    const total = this.passed + this.failed;
    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Pass Rate: ${passRate}%\n`);

    if (this.failed === 0) {
      console.log('✓ ALL TESTS PASSED\n');
    } else {
      console.log(`✗ ${this.failed} TEST(S) FAILED\n`);
      console.log('Failed Tests:');
      for (const result of this.results) {
        if (result.status !== 'PASSED') {
          console.log(`  - ${result.testName}: ${result.error}`);
        }
      }
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const tester = new RegressionTester(baseUrl);

  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
