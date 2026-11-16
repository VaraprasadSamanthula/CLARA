const http = require('http');

async function testChatAPI(question) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      messages: [{ content: question, role: 'user' }]
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  const tests = [
    { q: 'How many patients?', expected: 100 },
    { q: 'How many male patients?', expected: 57 },
    { q: 'Count female patients', expected: 43 },
    { q: 'Total admissions?', expected: 275 },
    { q: 'Number of prescriptions?', expected: 30970 },
    { q: 'How many lab tests?', expected: 107727 },
    { q: 'Total diagnosis count?', expected: 4506 },
    { q: 'What is average patient age?', expected: -1 }
  ];

  const results = [];
  for (const test of tests) {
    try {
      const result = await testChatAPI(test.q);
      let actualCount = 0;
      if (result.data.data && result.data.data[0]) {
        const first = result.data.data[0];
        actualCount = first.count || first.admission_count || first.total_prescriptions || 
                     first.total_tests || first.total_diagnoses || first.average_age || 0;
      }
      
      const pass = test.expected === -1 || actualCount === test.expected;
      results.push({
        question: test.q,
        status: result.status,
        expected: test.expected,
        actual: actualCount,
        pass: pass
      });
      
      console.log(`\n${pass ? '✓' : '✗'} Q: ${test.q}`);
      console.log(`  Status: ${result.status}, Expected: ${test.expected}, Actual: ${actualCount}`);
    } catch (e) {
      console.log(`✗ Error: ${e.message}`);
      results.push({
        question: test.q,
        status: 'ERROR',
        expected: test.expected,
        actual: 0,
        pass: false
      });
    }
  }
  
  const passed = results.filter(r => r.pass).length;
  console.log(`\n\nSUMMARY: ${passed}/${results.length} tests passed`);
  
  results.forEach(r => {
    if (!r.pass) {
      console.log(`FAILED: ${r.question} (expected ${r.expected}, got ${r.actual})`);
    }
  });
}

setTimeout(() => runTests(), 1000);
