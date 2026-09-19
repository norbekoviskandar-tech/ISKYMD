const db = require('better-sqlite3')('medbank.db');
const cols = db.prepare('PRAGMA table_info(products)').all();
console.log('Columns:', JSON.stringify(cols, null, 2));

const data = db.prepare('SELECT * FROM products').all();
console.log('Data:', JSON.stringify(data, null, 2));
