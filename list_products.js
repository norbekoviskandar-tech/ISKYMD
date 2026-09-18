const db = require('better-sqlite3')('medbank.db');
const products = db.prepare('SELECT id, name FROM products').all();
console.log(JSON.stringify(products, null, 2));
