const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const db = dbModule.getDb();

  const productId = '8053';
  const subjects = [
    'Basic Principles and Cardiac Physiology',
    'Recording and the 12-Lead System',
    'Rate, Rhythm, and Axis',
    'Chamber Enlargement and Hypertrophy',
    'Arrhythmias of Focal Origin',
    'Conduction Blocks',
    'Preexcitation Syndromes',
    'Myocardial Ischemia and Infarction',
    'Electrolytes, Drugs, and QT Abnormalities',
    'Miscellaneous Conditions and Systematic Interpretation'
  ];

  const result = db
    .prepare('UPDATE products SET subjects = ?, updatedAt = ? WHERE id = ?')
    .run(JSON.stringify(subjects), new Date().toISOString(), productId);

  console.log(`UPDATED_ROWS=${result.changes}`);

  const row = db.prepare('SELECT id, name, subjects FROM products WHERE id = ?').get(productId);
  let parsed = [];
  try {
    parsed = row?.subjects ? JSON.parse(row.subjects) : [];
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    parsed = [];
  }

  console.log(`PRODUCT=${row?.id} ${row?.name || ''}`);
  console.log(`COUNT=${parsed.length}`);
  parsed.forEach((s, i) => console.log(`${i + 1}. ${s}`));
})();
