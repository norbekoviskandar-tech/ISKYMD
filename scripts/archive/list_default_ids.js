const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054 ORDER BY id").all();
console.log(`TOTAL IN DEFAULT: ${questions.length}`);
console.log(questions.map(q => q.id).join(', '));
