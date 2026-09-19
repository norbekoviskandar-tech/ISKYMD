const db = require('better-sqlite3')('medbank.db');
const idsToCheck = ['45', '46', '49', '50', '54', '60', '70', '75', '77', '80', '354', '1440', '1529', '1831', '1832', '3061', '4010', '4569', '7415', '8043', '9047', '98017'];

console.log('--- VERIFYING IDS ---');
idsToCheck.forEach(id => {
    const q = db.prepare("SELECT id FROM questions WHERE id = ?").get(id);
    console.log(`${id}: ${q ? 'EXISTS' : 'NOT FOUND'}`);
});
