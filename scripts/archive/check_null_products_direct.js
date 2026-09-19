const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'medbank.db');
console.log("Checking database at:", dbPath);

try {
    const db = new Database(dbPath);
    
    // Check tables and columns
    const columns = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
    console.log("Columns in questions table:", columns.join(", "));

    const results = {};

    columns.forEach(col => {
        if (col.toLowerCase().includes('product') || col.toLowerCase().includes('package')) {
            const count = db.prepare(`SELECT COUNT(*) as count FROM questions WHERE ${col} IS NULL`).get().count;
            results[col] = count;
        }
    });

    console.log("Null counts for product/package related columns:");
    console.log(JSON.stringify(results, null, 2));

    const totalQuestions = db.prepare("SELECT COUNT(*) as count FROM questions").get().count;
    console.log("Total questions:", totalQuestions);

    Object.keys(results).forEach(col => {
        if (results[col] > 0) {
            console.log(`\nSample questions with NULL ${col}:`);
            const samples = db.prepare(`SELECT id, stem, subject, system FROM questions WHERE ${col} IS NULL LIMIT 3`).all();
            console.log(samples);
        }
    });

} catch (err) {
    console.error("Error checking questions:", err);
}
