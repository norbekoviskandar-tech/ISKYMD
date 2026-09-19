const Database = require('better-sqlite3');
const db = new Database('./medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => {
  const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
  if (fks.length > 0) {
    console.log(t.name);
    fks.forEach(fk => console.log('  ', JSON.stringify(fk)));
  }
});
