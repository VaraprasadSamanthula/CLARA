// Test answer generation logic

const msg = 'how many female patients?';
const recordCount = 1;
const data = [{count: 43}];

console.log('Testing answer generation for:', msg);
console.log('Data:', data);
console.log('');

// Female patient queries
console.log('Checking: msg.includes("female") &&  msg.includes("patient") && !msg.includes("male")');
console.log('Result:', msg.includes('female') && msg.includes('patient') && !msg.includes('male'));

if (msg.includes('female') && msg.includes('patient') && !msg.includes('male')) {
  console.log('[MATCHED] Female patient query');
  if (data[0]?.subject_id) {
    console.log('[DATA PATH] Has subject_id field');
    const patients = data.slice(0, 5).map((p, idx) => `Patient #${p.subject_id} (age ${p.anchor_age})`).join(', ');
    const answer = `Found ${recordCount} female patients matching your criteria. Examples: ${patients}.`;
    console.log('Answer:', answer);
  } else {
    console.log('[DATA PATH] No subject_id field, using count');
    const count = data[0]?.count || 0;
    const answer = `There are ${count} female patients in the database with detailed clinical information.`;
    console.log('Answer:', answer);
  }
} else {
  console.log('[NOT MATCHED] Female patient query');
  const answer = `The database query returned ${recordCount} records with detailed clinical information available for further analysis.`;
  console.log('Answer (generic fallback):', answer);
}
