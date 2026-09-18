const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id, stem, createdAt FROM questions ORDER BY createdAt DESC LIMIT 100').all();
console.log('Last 100 Questions:');
questions.forEach((q, i) => {
  const isNumeric = !q.id.includes('-');
  if (isNumeric || i < 10) {
    console.log(`${i+1}. [${q.id}] ${isNumeric ? 'NUMERIC' : 'UUID'} - ${q.stem.substring(0, 30)}... (${q.createdAt})`);
  }
});
