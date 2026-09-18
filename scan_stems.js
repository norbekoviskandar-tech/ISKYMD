const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id, stem FROM questions ORDER BY createdAt DESC LIMIT 40').all();

console.log('Checking for IDs hidden in stems:');
questions.forEach((q, i) => {
    const idMatch = q.stem.match(/Question\s*Id[:\s]*(\d+)/i) || q.stem.match(/Id[:\s]*(\d+)/i);
    if (idMatch) {
        console.log(`${i+1}. Found potential ID ${idMatch[1]} in stem of UUID ${q.id}`);
    } else {
         console.log(`${i+1}. No ID found in stem of UUID ${q.id}`);
    }
});
