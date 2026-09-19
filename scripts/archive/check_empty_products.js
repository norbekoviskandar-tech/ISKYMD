const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'medbank.db');

try {
    const db = new Database(dbPath);
    const totalQuestions = db.prepare("SELECT COUNT(*) as count FROM questions").get().count;
    console.log("Total questions:", totalQuestions);

    const emptyProductId = db.prepare("SELECT COUNT(*) as count FROM questions WHERE productId IS NULL OR productId = ''").get().count;
    const emptyPackageId = db.prepare("SELECT COUNT(*) as count FROM questions WHERE packageId IS NULL OR packageId = ''").get().count;

    console.log("Questions with NULL or empty productId:", emptyProductId);
    console.log("Questions with NULL or empty packageId:", emptyPackageId);

    if (emptyProductId > 0 || emptyPackageId > 0) {
        console.log("\nDetails of missing product info:");
        const samples = db.prepare("SELECT id, stem, subject, system, productId, packageId FROM questions WHERE productId IS NULL OR productId = '' OR packageId IS NULL OR packageId = ''").all();
        console.log(JSON.stringify(samples, null, 2));
    }

} catch (err) {
    console.error("Error:", err);
}
