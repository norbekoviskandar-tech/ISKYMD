const db = require('better-sqlite3')('medbank.db');
const columns = db.prepare('PRAGMA table_info(questions)').all();
console.log(JSON.stringify(columns, null, 2));
