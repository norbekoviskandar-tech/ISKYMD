const db = require('better-sqlite3')('medbank.db');
const fs = require('fs');
const q = db.prepare('SELECT * FROM questions WHERE id = ?').get('980');
fs.writeFileSync('raw_980_dump.json', JSON.stringify(q, null, 2));
