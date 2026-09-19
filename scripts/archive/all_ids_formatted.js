const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id FROM questions ORDER BY id').all();

console.log(`TOTAL QUESTIONS: ${questions.length}`);
console.log('\n--- ALL IDs ---');
let line = "";
questions.forEach((q, i) => {
    line += q.id + (i === questions.length - 1 ? "" : ", ");
    if (line.length > 80) {
        console.log(line);
        line = "";
    }
});
if (line) console.log(line);
