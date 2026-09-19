const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id, stem, createdAt FROM questions ORDER BY createdAt DESC LIMIT 40').all();
console.log('Last 40 Questions:');
questions.forEach((q, i) => {
  console.log(`${i+1}. [${q.id}] ${q.stem.substring(0, 50)}... (${q.createdAt})`);
});

const numericIds = db.prepare("SELECT id FROM questions WHERE id NOT LIKE '%-%-%-%-%' ORDER BY createdAt DESC LIMIT 10").all();
console.log('\nRecent Questions with Numeric/Custom IDs:');
numericIds.forEach(q => console.log(`- ${q.id}`));
