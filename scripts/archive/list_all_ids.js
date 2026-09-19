const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id FROM questions ORDER BY id').all();

const numericIds = [];
const uuidIds = [];

questions.forEach(q => {
    if (q.id.includes('-') && q.id.length > 20) {
        uuidIds.push(q.id);
    } else {
        numericIds.push(q.id);
    }
});

console.log(`TOTAL QUESTIONS: ${questions.length}\n`);

console.log(`--- NUMERIC / CUSTOM IDs (${numericIds.length}) ---`);
console.log(numericIds.join(', '));

console.log(`\n--- UUID / AUTO IDs (${uuidIds.length}) ---`);
uuidIds.forEach(id => console.log(id));
