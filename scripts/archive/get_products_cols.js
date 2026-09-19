const db = require('better-sqlite3')('medbank.db');
const cols = db.prepare('PRAGMA table_info(products)').all();
console.log(cols.map(c => c.name));
