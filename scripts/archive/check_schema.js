const Database = require('better-sqlite3');
const db = new Database('medbank.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const productsTable = tables.find(t => t.name === 'products');
const subscriptionPackagesTable = tables.find(t => t.name === 'subscription_packages');
console.log('Products table exists:', !!productsTable);
console.log('Subscription Packages table exists:', !!subscriptionPackagesTable);
if (productsTable) {
    const columns = db.prepare("PRAGMA table_info(products)").all();
    console.log('Products columns:', JSON.stringify(columns, null, 2));
}
if (subscriptionPackagesTable) {
    const columns = db.prepare("PRAGMA table_info(subscription_packages)").all();
    console.log('Subscription Packages columns:', JSON.stringify(columns, null, 2));
}
db.close();
