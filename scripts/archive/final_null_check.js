const db = require('better-sqlite3')('medbank.db');

const total = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
console.log('Total Questions:', total);

const checks = [
    { name: 'productId IS NULL', sql: "SELECT COUNT(*) as count FROM questions WHERE productId IS NULL" },
    { name: 'productId = ""', sql: "SELECT COUNT(*) as count FROM questions WHERE productId = ''" },
    { name: 'productId = "null"', sql: "SELECT COUNT(*) as count FROM questions WHERE productId = 'null' COLLATE NOCASE" },
    { name: 'packageId IS NULL', sql: "SELECT COUNT(*) as count FROM questions WHERE packageId IS NULL" },
    { name: 'packageId = ""', sql: "SELECT COUNT(*) as count FROM questions WHERE packageId = ''" },
    { name: 'packageId = 0', sql: "SELECT COUNT(*) as count FROM questions WHERE packageId = 0" }
];

checks.forEach(check => {
    const count = db.prepare(check.sql).get().count;
    console.log(`${check.name}: ${count}`);
});

if (total > 0) {
    console.log('\nAll questions in DB:');
    const all = db.prepare('SELECT id, productId, packageId, status, subject FROM questions').all();
    console.table(all);
}
