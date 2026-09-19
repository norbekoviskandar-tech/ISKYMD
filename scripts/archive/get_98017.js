const db = require('better-sqlite3')('medbank.db');
const question = db.prepare('SELECT * FROM questions WHERE id = ?').get('98017');
console.log(JSON.stringify(question, null, 2));
