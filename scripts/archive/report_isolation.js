const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const { getDb, fetchResultsByProduct, getUserProductStats } = dbModule;
  const userId = '3c3afa94-b4e1-4a47-b725-baab1eecfc184';
  const productA = '17';
  const productB = '19';

  console.log('--- Product Isolation Report ---');
  
  const resultsA = fetchResultsByProduct(userId, productA);
  const resultsB = fetchResultsByProduct(userId, productB);
  
  console.log(`Product A Results Count: ${resultsA.length}`);
  console.log(`Product B Results Count: ${resultsB.length}`);
  
  const statsA = getUserProductStats(userId, productA);
  const statsB = getUserProductStats(userId, productB);
  
  console.log('\nStats A:', JSON.stringify(statsA, null, 2));
  console.log('\nStats B:', JSON.stringify(statsB, null, 2));

})().catch(err => { console.error(err); process.exit(1); });
