const Database = require('better-sqlite3');
const db = new Database('clara.db');

// Test TC_007 manually
const question = "How many female patients?";

// What SQL should generate
function buildPatientConditions(msg) {
  let conditions = [];
  
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
  
  const genderContext = detectGenderContext(msg);
  console.log(`Gender context: ${genderContext}`);
  
  if (genderContext === 'female') {
    conditions.push("gender = 'f'");
  } else if (genderContext === 'male') {
    conditions.push("gender = 'm'");
  }
  
  return conditions;
}

const msg = question.toLowerCase();
const conditions = buildPatientConditions(msg);
console.log(`Conditions: ${JSON.stringify(conditions)}`);

const isCountQuery = msg.includes('how many') || msg.includes('total') || msg.includes('count');
console.log(`Is count query: ${isCountQuery}`);

let sql;
if (isCountQuery) {
  if (conditions.length > 0) {
    const where = conditions.join(' AND ');
    sql = `SELECT COUNT(*) as count FROM patients WHERE ${where}`;
  } else {
    sql = "SELECT COUNT(*) as count FROM patients";
  }
} else {
  if (conditions.length > 0) {
    const where = conditions.join(' AND ');
    sql = `SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients WHERE ${where} LIMIT 20`;
  } else {
    sql = "SELECT subject_id, gender, anchor_age, anchor_year_group FROM patients LIMIT 20";
  }
}

console.log(`Generated SQL: ${sql}`);

const result = db.prepare(sql).all();
console.log(`Result: ${JSON.stringify(result)}`);

db.close();
