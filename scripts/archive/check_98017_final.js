const db = require('better-sqlite3')('medbank.db');
const row = db.prepare("SELECT id FROM questions WHERE id = ?").get("98017");
console.log("98017 check:", row ? "FOUND" : "NOT FOUND");

const rowNumeric = db.prepare("SELECT id FROM questions WHERE id = ?").get(98017);
if (rowNumeric) console.log("98017 (numeric) check: FOUND");

const related = db.prepare("SELECT id FROM questions WHERE id LIKE '980%'").all();
console.log("IDs starting with 980:", related);
