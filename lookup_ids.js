const db = require('better-sqlite3')('medbank.db');
const ids = ['3004', '98017', '980'];
ids.forEach(id => {
    const q = db.prepare('SELECT id, productId, packageId, status, system, subject FROM questions WHERE id = ?').get(id);
    console.log(`ID ${id}:`, q || 'NOT FOUND');
});

console.log('\nSearching for similar IDs (containing 980):');
const similar = db.prepare("SELECT id FROM questions WHERE id LIKE '%980%'").all();
console.log(similar);
