const db = require('better-sqlite3')('medbank.db');
const drafts = db.prepare("SELECT id, productId FROM questions WHERE status = 'draft' ORDER BY createdAt DESC").all();

console.log(`TOTAL DRAFTS: ${drafts.length}`);

const defaultDrafts = drafts.filter(q => q.productId == '8054').map(q => q.id);
const ecgDrafts = drafts.filter(q => q.productId == '8053').map(q => q.id);

console.log(`\n--- DRAFTS IN DEFAULT (8054) [Count: ${defaultDrafts.length}] ---`);
console.log(defaultDrafts.join(', '));

console.log(`\n--- DRAFTS IN ECG (8053) [Count: ${ecgDrafts.length}] ---`);
console.log(ecgDrafts.join(', '));
