const db = require('better-sqlite3')('medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

const productsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
if (productsCheck) {
    const products = db.prepare('SELECT * FROM products').all();
    console.log('\n--- products table ---');
    console.table(products);
} else {
    console.log('\n"products" table does not exist.');
}
