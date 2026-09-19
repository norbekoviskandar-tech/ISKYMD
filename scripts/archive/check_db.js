const sqlite3 = require('better-sqlite3');
const db = new sqlite3('f:\\MedBank3 - Copy\\medbank.db');
const columns = db.prepare('PRAGMA table_info(tests)').all();
console.log('Columns in tests table:', columns.map(c => c.name));

const lastTest = db.prepare('SELECT * FROM tests ORDER BY createdAt DESC LIMIT 1').get();
console.log('Last test poolLogic:', lastTest?.poolLogic);
console.log('Last test pool:', lastTest?.pool);
db.close();
