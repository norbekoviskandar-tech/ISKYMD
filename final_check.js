const db = require('better-sqlite3')('medbank.db');
const results = db.prepare("SELECT id, productId, status FROM questions WHERE id = '98017' OR id = 98017").all();
console.log('Results for 98017:', results);

const results3004 = db.prepare("SELECT id, productId, status FROM questions WHERE id = '3004' OR id = 3004").all();
console.log('Results for 3004:', results3004);
