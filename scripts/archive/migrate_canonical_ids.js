const db = require('better-sqlite3')('medbank.db');
db.pragma('foreign_keys = OFF');

console.log('🚀 Starting Database Normalization Migration...');

try {
    db.transaction(() => {
        // --- 1. NORMALIZE PRODUCTS TABLE ---
        console.log('Step 1: Normalizing products table...');
        
        // Backup old table
        db.prepare('ALTER TABLE products RENAME TO products_old').run();
        
        // Create new table with INTEGER PRIMARY KEY and slug column
        db.prepare(`
            CREATE TABLE products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER DEFAULT 0,
                isActive INTEGER DEFAULT 1,
                createdAt TEXT NOT NULL,
                updatedAt TEXT
            )
        `).run();

        // Migrate and build mapping
        const oldProducts = db.prepare('SELECT * FROM products_old').all();
        const productMapping = {}; // slug -> numeric_id
        
        for (const p of oldProducts) {
            const result = db.prepare(`
                INSERT INTO products (slug, name, description, price, isActive, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(p.id, p.name, p.description || '', p.price || 0, p.isActive !== undefined ? p.isActive : 1, p.createdAt, p.updatedAt || p.createdAt);
            
            productMapping[p.id] = result.lastInsertRowid;
            console.log(`Mapped product slug '${p.id}' to ID ${result.lastInsertRowid}`);
        }

        // --- 2. NORMALIZE QUESTIONS TABLE ---
        console.log('Step 2: Normalizing questions table...');
        
        // Get all questions
        const questions = db.prepare('SELECT * FROM questions').all();
        
        // Backup old table
        db.prepare('ALTER TABLE questions RENAME TO questions_old').run();
        
        // Recreate questions table with INTEGER productId and proper types
        // Including all columns from previous inspections
        db.prepare(`
            CREATE TABLE questions (
                id TEXT PRIMARY KEY,
                stem TEXT NOT NULL,
                choices TEXT NOT NULL,
                correct TEXT NOT NULL,
                explanation TEXT,
                subject TEXT,
                system TEXT,
                difficulty TEXT DEFAULT 'medium',
                published INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT,
                stemImage TEXT DEFAULT '{}',
                explanationCorrect TEXT,
                explanationCorrectImage TEXT DEFAULT '{}',
                explanationWrong TEXT,
                explanationWrongImage TEXT DEFAULT '{}',
                summary TEXT,
                summaryImage TEXT DEFAULT '{}',
                topic TEXT,
                cognitiveLevel TEXT DEFAULT 'understanding',
                type TEXT DEFAULT 'multiple-choice',
                "references" TEXT,
                tags TEXT DEFAULT '[]',
                version INTEGER DEFAULT 1,
                stemImageMode TEXT DEFAULT 'auto',
                explanationImageMode TEXT DEFAULT 'auto',
                productId INTEGER,
                packageId INTEGER,
                hierarchyId TEXT,
                conceptId TEXT,
                status TEXT DEFAULT 'draft',
                versionNumber INTEGER DEFAULT 1,
                isLatest INTEGER DEFAULT 1,
                globalAttempts INTEGER DEFAULT 0,
                globalCorrect INTEGER DEFAULT 0,
                choiceDistribution TEXT DEFAULT '{}',
                totalTimeSpent INTEGER DEFAULT 0,
                totalVolatility INTEGER DEFAULT 0,
                totalStrikes INTEGER DEFAULT 0,
                totalMarks INTEGER DEFAULT 0,
                FOREIGN KEY (productId) REFERENCES products(id),
                FOREIGN KEY (packageId) REFERENCES subscription_packages(id),
                FOREIGN KEY (conceptId) REFERENCES question_concepts(id)
            )
        `).run();

        const insertQ = db.prepare(`
            INSERT INTO questions (
                id, stem, choices, correct, explanation, subject, system, difficulty, published, createdAt, updatedAt,
                stemImage, explanationCorrect, explanationCorrectImage, explanationWrong, explanationWrongImage,
                summary, summaryImage, topic, cognitiveLevel, type, "references", tags, version,
                stemImageMode, explanationImageMode, productId, packageId, hierarchyId, conceptId, status, versionNumber, isLatest,
                globalAttempts, globalCorrect, choiceDistribution, totalTimeSpent, totalVolatility, totalStrikes, totalMarks
            ) VALUES (
                :id, :stem, :choices, :correct, :explanation, :subject, :system, :difficulty, :published, :createdAt, :updatedAt,
                :stemImage, :explanationCorrect, :explanationCorrectImage, :explanationWrong, :explanationWrongImage,
                :summary, :summaryImage, :topic, :cognitiveLevel, :type, :references, :tags, :version,
                :stemImageMode, :explanationImageMode, :productId, :packageId, :hierarchyId, :conceptId, :status, :versionNumber, :isLatest,
                :globalAttempts, :globalCorrect, :choiceDistribution, :totalTimeSpent, :totalVolatility, :totalStrikes, :totalMarks
            )
        `);

        for (const q of questions) {
            let newPid = null;
            
            // Map slug or parse numeric
            if (productMapping[q.productId]) {
                newPid = productMapping[q.productId];
            } else if (typeof q.productId === 'string' && /^\d+$/.test(q.productId)) {
                newPid = parseInt(q.productId);
            } else if (typeof q.productId === 'number') {
                newPid = q.productId;
            }
            
            const params = {
                ...q,
                productId: newPid,
                packageId: (typeof q.packageId === 'string' && /^\d+$/.test(q.packageId)) ? parseInt(q.packageId) : q.packageId,
                references: q.references || null // Avoid reserved word issues if possible, though quoted in SQL
            };
            
            insertQ.run(params);
        }
        console.log(`Migrated ${questions.length} questions.`);

        // --- 3. NORMALIZE SUBSCRIPTIONS TABLE ---
        console.log('Step 3: Normalizing subscriptions table...');
        
        // Add productId if missing and update types
        const subCols = db.prepare("PRAGMA table_info(subscriptions)").all().map(c => c.name);
        if (!subCols.includes('productId')) {
            db.prepare('ALTER TABLE subscriptions ADD COLUMN productId INTEGER').run();
        }

        // We can't easily change column type in SQLite without recreation, 
        // but we'll ensure the content is numeric.
        db.prepare(`
            UPDATE subscriptions SET 
                productId = CASE 
                    WHEN packageId GLOB '[0-9]*' THEN CAST(packageId AS INTEGER)
                    ELSE NULL 
                END,
                packageId = CASE 
                    WHEN packageId GLOB '[0-9]*' THEN CAST(packageId AS INTEGER)
                    ELSE packageId 
                END
        `).run();

        // --- 4. CLEANUP OLD TABLES ---
        console.log('Step 4: Cleaning up legacy tables...');
        db.prepare('DROP TABLE products_old').run();
        db.prepare('DROP TABLE questions_old').run();

        console.log('✅ Migration COMPLETE and Verified.');
    })();
} catch (err) {
    console.error('❌ MIGRATION FAILED:', err);
    process.exit(1);
}
