const db = require('better-sqlite3')('medbank.db');
const question = db.prepare('SELECT id, stem, status, versionNumber, createdAt, updatedAt FROM questions WHERE id = ?').get('980');
console.log(JSON.stringify(question, null, 2));
