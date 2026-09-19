const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const projectRoot = path.join(__dirname);
  const serverDbUrl = pathToFileURL(path.join(projectRoot, 'src', 'lib', 'server-db.js')).href;
  const dbModule = await import(serverDbUrl);
  const { saveTest, saveStudentAnswer, getUserProductStats, getGlobalStats, getDb } = dbModule;

  const db = getDb();
  
  const userId = '3c3afa94-b4e1-4a47-b725-baab1ecfc184';
  const productAId = '17';
  const productBId = '19';

  try {
    console.log('--- Testing Product A ---');
    const testAId = 'test-a-' + Date.now();
    saveTest({
      testId: testAId,
      userId: userId,
      productId: productAId,
      packageId: productAId,
      questions: [{ id: '8004', stem: 'Q1' }],
      date: new Date().toISOString()
    });
    console.log('Test A created.');

    saveStudentAnswer({
      studentId: userId,
      testId: testAId,
      productId: productAId,
      packageId: productAId,
      questionId: '8004',
      answer: 'A',
      isCorrect: true,
      answerData: { timeSpent: 10 }
    });
    console.log('Answer A saved.');

    console.log('Checking Stats A...');
    const statsA = getUserProductStats(userId, productAId);
    console.log('Stats A worked');

    console.log('Checking Product B...');
    const testBId = 'test-b-' + Date.now();
    saveTest({
      testId: testBId,
      userId: userId,
      productId: productBId,
      packageId: productBId,
      questions: [{ id: 'q-b1', stem: 'QB1' }],
      date: new Date().toISOString()
    });
    saveStudentAnswer({
      studentId: userId,
      testId: testBId,
      productId: productBId,
      packageId: productBId,
      questionId: 'q-b1',
      answer: 'A',
      isCorrect: true,
      answerData: { timeSpent: 5 }
    });
    const statsB = getUserProductStats(userId, productBId);
    
    fs.writeFileSync('verify_success.txt', 'Product stats isolation confirmed');
  } catch (e) {
    fs.writeFileSync('verify_error.txt', e.message + '\n' + e.stack);
    process.exit(1);
  }

})().catch(err => { console.error(err); process.exit(1); });
