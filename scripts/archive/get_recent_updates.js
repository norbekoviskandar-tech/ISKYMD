const db = require('better-sqlite3')('medbank.db');
const question = db.prepare('SELECT id, status, versionNumber, updatedAt FROM questions ORDER BY updatedAt DESC LIMIT 5').all();
console.log(JSON.stringify(question, null, 2));
