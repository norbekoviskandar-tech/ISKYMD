const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id, createdAt FROM questions ORDER BY createdAt DESC LIMIT 100').all();
console.log('--- Last 100 Question IDs (Most Recent First) ---');
questions.forEach((q, i) => {
    const type = q.id.includes('-') && q.id.length > 20 ? 'UUID' : 'NUMERIC';
    console.log(`${(i+1).toString().padStart(3, ' ')}. [${q.id.padEnd(36, ' ')}] ${type} | ${q.createdAt}`);
});
