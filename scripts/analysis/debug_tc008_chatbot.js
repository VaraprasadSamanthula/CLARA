/**
 * Debug TC_008 to see what SQL the chatbot generates
 */

const Database = require('better-sqlite3');
const db = new Database('clara.db');

// Simulate the detectGenderContext function from the chatbot
function detectGenderContext(msg) {
  const hasFemale = msg.includes('female') || msg.includes('woman') || msg.includes('women');
  const hasMale = msg.includes('male') || msg.includes('man') || msg.includes('men');
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

const question = "How many patients are older than 60?";
const msg = question.toLowerCase();

console.log('Question:', question);
console.log('Lowercase:', msg);
console.log('');

const genderContext = detectGenderContext(msg);
console.log('Detected gender context:', genderContext);

if (genderContext === 'male') {
  console.log('\nBUG CONFIRMED: Detected "male" when none should be detected!');
  console.log('This causes SQL to be: SELECT COUNT(*) as count FROM patients WHERE gender = "m" AND anchor_age > 60');
  
  const buggy_sql = 'SELECT COUNT(*) as count FROM patients WHERE gender = \'m\' AND anchor_age > 60';
  const buggy_result = db.prepare(buggy_sql).get();
  console.log(`Buggy result: ${buggy_result.count} patients (WRONG)`);
  
  console.log('\nCorrect SQL should be: SELECT COUNT(*) as count FROM patients WHERE anchor_age > 60');
  const correct_sql = 'SELECT COUNT(*) as count FROM patients WHERE anchor_age > 60';
  const correct_result = db.prepare(correct_sql).get();
  console.log(`Correct result: ${correct_result.count} patients (RIGHT)`);
  
  console.log('\nThe word "male" is being detected in:', question);
  console.log('Let me find it...');
  for (let i = 0; i < question.length - 3; i++) {
    if (question.substring(i, i+4).toLowerCase() === 'male') {
      console.log(`Found at position ${i}: "${question.substring(Math.max(0, i-5), i+10)}"`);
    }
  }
} else {
  console.log('No bug - gender context correctly identified as:', genderContext);
}

db.close();
