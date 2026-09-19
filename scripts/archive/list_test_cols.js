const db = require('better-sqlite3')('medbank.db');
const columns = db.prepare('PRAGMA table_info(tests)').all();
console.log(columns.map(c => c.name).join(', '));
