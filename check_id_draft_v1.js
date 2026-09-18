const db = require('better-sqlite3')('medbank.db');
const question = db.prepare("SELECT * FROM questions WHERE id = 'draft_v1'").get();
console.log(JSON.stringify(question, null, 2));
