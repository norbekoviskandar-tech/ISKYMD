const { getDb } = require('./src/lib/server-db');
const { createQuestion, getQuestionById } = require('./src/lib/db/questions.repo');

const testId = "test-id-" + Date.now();
const payload = {
  id: testId,
  stem: "Test Question",
  choices: [{ text: "A", id: "A" }],
  correct: "A",
  system: "Test",
  subject: "Test",
  productId: "test-product",
  packageId: "test-product"
};

try {
  console.log('Checking if question exists...');
  const existing = getQuestionById(testId);
  console.log('Existing:', existing);
  
  console.log('Creating question...');
  createQuestion(payload);
  console.log('Success!');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
