const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id, stem FROM questions WHERE stem LIKE '%draft v1%'").all();
console.log(JSON.stringify(questions, null, 2));
