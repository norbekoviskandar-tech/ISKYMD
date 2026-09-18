const db = require('better-sqlite3')('medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    for (const col of columns) {
        const results = db.prepare(`SELECT * FROM "${table.name}" WHERE "${col.name}" LIKE '%draft v1%'`).all();
        if (results.length > 0) {
            console.log(`Table: ${table.name}, Column: ${col.name}`);
            console.log(JSON.stringify(results, null, 2));
        }
    }
}
