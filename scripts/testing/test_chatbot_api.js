/**
 * Test the chatbot API endpoint directly
 * This tests the actual /api/chat endpoint to verify generated SQL and responses
 */

const http = require('http');

// Helper to make API requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session_id=test-session'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            body: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test chatbot questions
async function runTests() {
  console.log('=== CLARA CHATBOT API TEST ===\n');
  console.log('Note: This test requires npm run dev to be running first.\n');

  const tests = [
    {
      id: 1,
      question: "How many patients are in the database?",
      shouldContain: ['100', 'patient', 'database']
    },
    {
      id: 2,
      question: "How many male and female patients?",
      shouldContain: ['male', 'female', 'gender', 'distribution']
    },
    {
      id: 3,
      question: "How many female patients?",
      shouldContain: ['female', '43']
    },
    {
      id: 4,
      question: "How many male patients?",
      shouldContain: ['male', '57']
    },
    {
      id: 5,
      question: "Show me female patients",
      shouldContain: ['female', 'patient']
    },
    {
      id: 6,
      question: "Find patients older than 50",
      shouldContain: ['50', 'age', 'patient']
    },
    {
      id: 7,
      question: "What are the most common medications?",
      shouldContain: ['medication', 'Insulin', 'prescription']
    },
    {
      id: 8,
      question: "How many ICU stays?",
      shouldContain: ['ICU', '140']
    },
    {
      id: 9,
      question: "What is the average age?",
      shouldContain: ['age', '61', '62']
    },
    {
      id: 10,
      question: "How many diagnoses are recorded?",
      shouldContain: ['4506', 'diagnos']
    }
  ];

  console.log(`Testing ${tests.length} chatbot questions...\n`);

  for (const test of tests) {
    console.log(`[TEST ${test.id}] "${test.question}"`);
    
    try {
      const response = await makeRequest('POST', '/api/chat', {
        messages: [{ content: test.question, role: 'user' }]
      });

      if (response.status === 200 && response.body.success) {
        const answer = response.body.clinical_answer?.toLowerCase() || '';
        const sqlGenerated = response.body.sql_query || 'Not shown';
        
        // Check if response contains expected terms
        const containsExpected = test.shouldContain.some(term => 
          answer.includes(term.toLowerCase())
        );

        if (containsExpected) {
          console.log(`  ✅ PASS`);
          console.log(`     Response: ${answer.substring(0, 100)}...`);
          console.log(`     SQL: ${sqlGenerated.substring(0, 80)}...`);
        } else {
          console.log(`  ❌ FAIL - Response doesn't contain expected terms`);
          console.log(`     Expected one of: ${test.shouldContain.join(', ')}`);
          console.log(`     Got: ${answer.substring(0, 100)}...`);
        }
      } else if (response.status === 401) {
        console.log(`  ⚠️  SKIP - Authentication required`);
        console.log(`     (Set valid session cookie or run with authentication)`);
      } else {
        console.log(`  ❌ FAIL - Status ${response.status}`);
        console.log(`     Response: ${JSON.stringify(response.body).substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ❌ ERROR - ${err.message}`);
      console.log(`     (Make sure the server is running: npm run dev)`);
    }
    console.log('');
  }

  console.log('=== TEST COMPLETE ===');
}

// Run tests
runTests().catch(console.error);
