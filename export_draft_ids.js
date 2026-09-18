const db = require('better-sqlite3')('medbank.db');
const fs = require('fs');
const drafts = db.prepare("SELECT id FROM questions WHERE status = 'draft' AND versionNumber = 1 ORDER BY id").all();
const ids = drafts.map(d => d.id).join(', ');
fs.writeFileSync('draft_ids_final.txt', ids, 'utf8');
console.log(`Wrote ${drafts.length} IDs to draft_ids_final.txt`);
