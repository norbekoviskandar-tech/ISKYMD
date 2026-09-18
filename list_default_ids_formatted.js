const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054 ORDER BY id").all();
console.log(`TOTAL IN DEFAULT: ${questions.length}`);
let line = "";
questions.forEach((q, i) => {
    line += q.id + (i === questions.length - 1 ? "" : ", ");
    if (line.length > 80) {
        console.log(line);
        line = "";
    }
});
if (line) console.log(line);
