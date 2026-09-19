const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id, conceptId FROM questions WHERE conceptId LIKE '%draft%'").all();
console.log(JSON.stringify(questions, null, 2));
