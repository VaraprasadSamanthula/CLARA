const question = "How many patients are older than 60?";
const msg = question.toLowerCase();

console.log('Question:', question);
console.log('Lowercase:', msg);
console.log('');

const hasMale = msg.includes('male') || msg.includes('man') || msg.includes('men');
console.log('hasMale:', hasMale);

// Check each condition
console.log('msg.includes("male"):', msg.includes('male'));
console.log('msg.includes("man"):', msg.includes('man'));
console.log('msg.includes("men"):', msg.includes('men'));

if (msg.includes('man')) {
  console.log('\nFound "man" in the string!');
  const idx = msg.indexOf('man');
  console.log(`Position: ${idx}`);
  console.log(`Context: "${msg.substring(Math.max(0, idx-5), idx+8)}"`);
}
