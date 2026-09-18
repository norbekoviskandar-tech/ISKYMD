const db = require('better-sqlite3')('medbank.db');
const questions = db.prepare('SELECT id, createdAt FROM questions ORDER BY createdAt DESC').all();
let uuidCount = 0;
let numericCount = 0;
let firstNumeric = null;
let lastUuid = null;

questions.forEach((q, i) => {
    const isUuid = q.id.includes('-') && q.id.length > 20;
    if (isUuid) {
        uuidCount++;
        if (i === 0) lastUuid = q;
    } else {
        numericCount++;
        if (firstNumeric === null) firstNumeric = q;
    }
});

console.log(`Total questions: ${questions.length}`);
console.log(`Total UUID IDs: ${uuidCount}`);
console.log(`Total Numeric IDs: ${numericCount}`);
if (firstNumeric) console.log(`Most recent numeric ID: ${firstNumeric.id} (at ${firstNumeric.createdAt})`);
if (lastUuid) console.log(`Most recent UUID ID: ${lastUuid.id} (at ${lastUuid.createdAt})`);

console.log('\nTop 40 IDs:');
questions.slice(0, 40).forEach((q, i) => {
    console.log(`${i+1}. ${q.id}`);
});
