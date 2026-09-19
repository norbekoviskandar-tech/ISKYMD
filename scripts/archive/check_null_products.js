const { getDb } = require('./src/lib/server-db');

try {
    const db = getDb();
    
    // Check tables and columns
    const columns = db.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
    console.log("Columns in questions table:", columns.join(", "));

    const nullProductId = columns.includes('productId') 
        ? db.prepare("SELECT COUNT(*) as count FROM questions WHERE productId IS NULL").get().count 
        : "N/A (column missing)";
        
    const nullPackageId = columns.includes('packageId') 
        ? db.prepare("SELECT COUNT(*) as count FROM questions WHERE packageId IS NULL").get().count 
        : "N/A (column missing)";

    const nullProduct_id = columns.includes('product_id') 
        ? db.prepare("SELECT COUNT(*) as count FROM questions WHERE product_id IS NULL").get().count 
        : "N/A (column missing)";

    console.log("Questions with NULL productId:", nullProductId);
    console.log("Questions with NULL packageId:", nullPackageId);
    console.log("Questions with NULL product_id:", nullProduct_id);

    if (typeof nullProductId === 'number' && nullProductId > 0) {
        console.log("\nSample questions with NULL productId:");
        const samples = db.prepare("SELECT id, stem, subject, system FROM questions WHERE productId IS NULL LIMIT 5").all();
        console.log(samples);
    }

    if (typeof nullPackageId === 'number' && nullPackageId > 0) {
        console.log("\nSample questions with NULL packageId:");
        const samples = db.prepare("SELECT id, stem, subject, system FROM questions WHERE packageId IS NULL LIMIT 5").all();
        console.log(samples);
    }

} catch (err) {
    console.error("Error checking questions:", err);
}
