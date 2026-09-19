const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const serverDbUrl = pathToFileURL(path.join(__dirname, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const { fetchResultsByProduct } = dbModule;

  const studentId = '3c3afa94-b4e1-4a47-b725-baab1ecfc184';
  const productAId = '17';
  const productBId = '19';

  console.log('--- Final Product Isolation Verification ---');
  
  const resultsA = fetchResultsByProduct(studentId, productAId);
  console.log(`\nProduct A results (${productAId}):`, resultsA.length, 'found');
  resultsA.forEach(r => {
    console.log(`  - Question: ${r.questionId}, Product in DB: ${r.productId}`);
    if (r.productId !== productAId) {
      console.error(`  ❌ Mismatch: Found product ${r.productId} in results for ${productAId}`);
    }
  });

  const resultsB = fetchResultsByProduct(studentId, productBId);
  console.log(`\nProduct B results (${productBId}):`, resultsB.length, 'found');
  resultsB.forEach(r => {
    console.log(`  - Question: ${r.questionId}, Product in DB: ${r.productId}`);
    if (r.productId !== productBId) {
      console.error(`  ❌ Mismatch: Found product ${r.productId} in results for ${productBId}`);
    }
  });

  if (resultsA.length > 0 && resultsB.length > 0 && 
      resultsA.every(r => r.productId === productAId) && 
      resultsB.every(r => r.productId === productBId)) {
    console.log('\n✅ VERIFICATION PASSED: Results are strictly isolated by Product ID.');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Missing data or mixed results.');
  }

})().catch(err => { console.error(err); process.exit(1); });
