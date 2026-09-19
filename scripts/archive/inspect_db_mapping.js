const db = require('better-sqlite3')('medbank.db');

try {
    const products = db.prepare('SELECT * FROM subscription_packages').all();
    console.log('--- subscription_packages ---');
    console.table(products);

    const questionsStats = db.prepare('SELECT productId, COUNT(*) as count FROM questions GROUP BY productId').all();
    console.log('\n--- Questions productId stats ---');
    console.table(questionsStats);

    const subscriptions = db.prepare('SELECT * FROM subscriptions LIMIT 5').all();
    console.log('\n--- Subscriptions samples ---');
    console.table(subscriptions);

} catch (err) {
    console.error('Error:', err);
}
