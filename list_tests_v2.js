const db = require('better-sqlite3')('medbank.db');
const tests = db.prepare('SELECT testId, testNumber FROM tests').all();
console.log(JSON.stringify(tests, null, 2));
