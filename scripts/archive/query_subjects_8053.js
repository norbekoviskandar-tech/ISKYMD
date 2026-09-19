const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const db = dbModule.getDb();

  const productId = '8053';
  const rows = db
    .prepare(
      'SELECT DISTINCT subject FROM questions WHERE (productId = ? OR packageId = ?) AND subject IS NOT NULL AND LENGTH(TRIM(subject)) > 0 ORDER BY subject'
    )
    .all(productId, productId);

  console.log(`COUNT=${rows.length}`);
  rows.forEach((r, i) => console.log(`${i + 1}. ${r.subject}`));
})();
