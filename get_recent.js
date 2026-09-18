const db = require('better-sqlite3')('medbank.db');
const question = db.prepare('SELECT id, stem, status, versionNumber FROM questions ORDER BY createdAt DESC LIMIT 1').get();
console.log(JSON.stringify(question, null, 2));
