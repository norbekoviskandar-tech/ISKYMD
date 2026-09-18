const db = require('better-sqlite3')('medbank.db');
const question = db.prepare('SELECT * FROM questions WHERE id = ?').get('24df0bed-8240-4465-a95c-9698ec11d104');
console.log(JSON.stringify(question, null, 2));
