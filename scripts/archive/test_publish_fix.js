const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const { publishQuestion, getDb } = dbModule;

  const db = getDb();
  db.pragma('foreign_keys = OFF'); // Bypass FK for verification of NOT NULL fix

  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  const q = db.prepare('SELECT id, conceptId FROM questions LIMIT 1').get();

  console.log(`Testing with User: ${user.id}, Question: ${q.id}`);
  
  try {
    publishQuestion(q.id, user.id);
    console.log("✅ Success! publishQuestion completed without NOT NULL constraint failure.");
    
    // Check if it was logged in governance_history
    const history = db.prepare("SELECT * FROM governance_history WHERE versionId = ? ORDER BY performedAt DESC LIMIT 1").get(q.id);
    console.log("Logged history item:", history);
    
    if (history && history.conceptId === q.conceptId) {
       console.log("✅ conceptId was correctly resolved and logged:", history.conceptId);
    } else {
       console.error("❌ conceptId mismatch or missing!", { expected: q.conceptId, actual: history?.conceptId });
       process.exit(1);
    }
  } catch (e) {
    console.error("❌ FAILED:", e.message);
    process.exit(1);
  } finally {
    db.pragma('foreign_keys = ON');
  }

})().catch(err => { console.error(err); process.exit(1); });
