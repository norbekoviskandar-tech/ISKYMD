const db = require('better-sqlite3')('medbank.db');
const drafts = db.prepare("SELECT id FROM questions WHERE status = 'draft' AND versionNumber = 1 ORDER BY id").all();
drafts.forEach(d => console.log(d.id));
