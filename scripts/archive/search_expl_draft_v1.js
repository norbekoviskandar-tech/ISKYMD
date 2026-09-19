const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id, explanation FROM questions WHERE explanation LIKE '%draft v1%'").all();
console.log(JSON.stringify(questions, null, 2));
