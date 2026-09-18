const db = require('better-sqlite3')('medbank.db');

console.log('--- EXACT MATCH CHECK ---');
const exactString = db.prepare("SELECT id, productId, status, system, subject FROM questions WHERE id = '98017'").get();
console.log('As String \'98017\':', exactString || 'NOT FOUND');

const exactNum = db.prepare("SELECT id, productId, status, system, subject FROM questions WHERE id = 98017").get();
console.log('As Number 98017:', exactNum || 'NOT FOUND');

console.log('\n--- LIKE MATCH CHECK ---');
const likeMatch = db.prepare("SELECT id, productId, status FROM questions WHERE id LIKE '%98017%'").all();
console.log('ID LIKE \'%98017%\':', likeMatch);

console.log('\n--- ALL IDS IN DEFAULT (8054) ---');
const allDefault = db.prepare("SELECT id FROM questions WHERE productId = '8054' OR productId = 8054").all();
const has98017 = allDefault.some(q => q.id == '98017');
console.log('Is 98017 in the 8054 list?', has98017);

if (!has98017) {
    console.log('Sample IDs from 8054:', allDefault.slice(0, 10).map(q => q.id));
}
