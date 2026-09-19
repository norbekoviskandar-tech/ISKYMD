const db = require('better-sqlite3')('medbank.db');

try {
    const packages = db.prepare('SELECT id, name FROM subscription_packages').all();
    console.log('Packages:', JSON.stringify(packages, null, 2));

    const questionsStats = db.prepare('SELECT productId, COUNT(*) as count FROM questions GROUP BY productId').all();
    console.log('Question ProductID Stats:', JSON.stringify(questionsStats, null, 2));

    const subscriptions = db.prepare('SELECT id, userId, packageId, status FROM subscriptions LIMIT 5').all();
    console.log('Subscriptions:', JSON.stringify(subscriptions, null, 2));

} catch (err) {
    console.error('Error:', err);
}
