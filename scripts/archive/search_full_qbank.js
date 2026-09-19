const db = require('better-sqlite3')('medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const table of tables) {
    const tableName = table.name;
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    for (const col of columns) {
        try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}" WHERE "${col.name}" = 'full-qbank'`).get().count;
            if (count > 0) {
                console.log(`Table: ${tableName}, Column: ${col.name}, Count: ${count}`);
            }
        } catch (e) {}
    }
}
