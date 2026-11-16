const Database = require('better-sqlite3');
const db = new Database('clara.db');

console.log('Checking gender values:');
const genderValues = db.prepare('SELECT DISTINCT gender FROM patients').all();
console.log('Distinct gender values:', genderValues);

const counts = db.prepare("SELECT gender, COUNT(*) as count FROM patients GROUP BY gender").all();
console.log('\nGender distribution:');
counts.forEach(row => console.log(`  ${row.gender}: ${row.count}`));

db.close();
