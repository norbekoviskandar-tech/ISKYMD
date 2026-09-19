const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const db = dbModule.getDb();

  const productId = '8053';
  const row = db.prepare('SELECT id, name, subjects FROM products WHERE id = ?').get(productId);

  if (!row) {
    console.log('NOT_FOUND');
    return;
  }

  let subjects = [];
  try {
    subjects = row.subjects ? JSON.parse(row.subjects) : [];
    if (typeof subjects === 'string') subjects = JSON.parse(subjects);
    if (!Array.isArray(subjects)) subjects = [];
  } catch {
    subjects = [];
  }

  console.log(`PRODUCT=${row.id} ${row.name}`);
  console.log(`COUNT=${subjects.length}`);
  subjects.forEach((s, i) => console.log(`${i + 1}. ${s}`));
})();
