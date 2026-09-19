const db = require('better-sqlite3')('medbank.db');
const cols = db.prepare('PRAGMA table_info(subscription_packages)').all();
console.log(JSON.stringify(cols, null, 2));

const data = db.prepare('SELECT * FROM subscription_packages').all();
console.log('Data:', JSON.stringify(data, null, 2));
