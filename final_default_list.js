const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054 ORDER BY createdAt DESC").all();
console.log(`TOTAL QUESTIONS IN DEFAULT: ${questions.length}`);
console.log('--- ALL 79 IDs (Most Recent First) ---');
let output = [];
questions.forEach((q, i) => {
    output.push(q.id);
});
console.log(output.join(', '));
