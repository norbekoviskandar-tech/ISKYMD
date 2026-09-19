const db = require('better-sqlite3')('medbank.db');
const products = db.prepare('SELECT DISTINCT productId FROM questions').all();
const packages = db.prepare('SELECT DISTINCT packageId FROM questions').all();
console.log('Distinct productIds:', products);
console.log('Distinct packageIds:', packages);
