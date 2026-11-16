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
    'How many patients?',
    'How many male patients?',
    'How many female patients?',
    'How many admissions?',
    'How many prescriptions?'
  ];

  for (const q of tests) {
    try {
      const result = await testChatAPI(q);
      console.log(`\nQ: ${q}`);
      console.log(`Status: ${result.status}`);
      console.log(`Records: ${result.data.records_found}`);
      if (result.data.data && result.data.data[0]) {
        console.log(`Data: ${JSON.stringify(result.data.data[0])}`);
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }
}

setTimeout(() => runTests(), 1000);
