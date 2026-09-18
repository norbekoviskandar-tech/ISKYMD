const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054 ORDER BY id").all();
console.log(`TOTAL IN DEFAULT: ${questions.length}`);
const ids = questions.map(q => q.id);
for (let i = 0; i < ids.length; i += 10) {
    console.log(ids.slice(i, i + 10).join(', '));
}
