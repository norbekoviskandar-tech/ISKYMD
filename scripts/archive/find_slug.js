const db = require('better-sqlite3')('medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

for (const table of tables) {
    const tableName = table.name;
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    for (const col of columns) {
        if (col.type.toLowerCase().includes('text') || col.type.toLowerCase().includes('string') || col.type === '') {
            try {
                const results = db.prepare(`SELECT * FROM ${tableName} WHERE "${col.name}" = 'full-qbank'`).all();
                if (results.length > 0) {
                    console.log(`Found 'full-qbank' in table '${tableName}', column '${col.name}':`, results);
                }
            } catch (e) {
                // Skip if query fails (e.g. invalid column name or virtual table)
            }
        }
    }
}
