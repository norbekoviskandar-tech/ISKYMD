const db = require('better-sqlite3')('medbank.db');
const drafts = db.prepare("SELECT id FROM questions WHERE status = 'draft' AND versionNumber = 1 ORDER BY id").all();
console.log(`Found ${drafts.length} Draft V1 questions:`);
drafts.forEach((d, i) => {
    process.stdout.write(d.id + (i === drafts.length - 1 ? '' : ', '));
});
console.log('\n');
