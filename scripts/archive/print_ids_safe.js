const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054 ORDER BY createdAt DESC").all();
const ids = questions.map(q => q.id);
console.log(`TOTAL: ${ids.length}`);
for (let i = 0; i < ids.length; i += 5) {
    console.log(ids.slice(i, i + 5).join(', '));
}
