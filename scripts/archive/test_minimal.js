const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const { getDb, saveTest } = dbModule;
  const userId = '3c3afa94-b4e1-4a47-b725-baab1eecfc184';
  const productAId = '17';
  const testId = 'minimal-test-' + Date.now();

  try {
    console.log('Attempting saveTest...');
    saveTest({
      testId: testId,
      userId: userId,
      productId: productAId,
      packageId: productAId,
      questions: [{ id: '8004', stem: 'Q1' }],
      date: new Date().toISOString()
    });
    console.log('saveTest success');
  } catch (e) {
    console.error('saveTest failed:', e);
  }

})().catch(err => { console.error(err); process.exit(1); });
