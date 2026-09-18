import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Database file path - stored in project root
const findDbPath = () => {
    // Priority 1: Current working directory
    const cwdPath = path.join(process.cwd(), 'medbank.db');
    if (fs.existsSync(cwdPath)) return cwdPath;
    
    // Priority 2: One level up (if running from src or app)
    const upPath = path.join(process.cwd(), '..', 'medbank.db');
    if (fs.existsSync(upPath)) return upPath;
    
    // Default to root
    return cwdPath;
};

export const DB_PATH = findDbPath();

let db = null;

export function getDb() {
  if (!db) {
    console.log('DB: Opening database at:', DB_PATH);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000000');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    seedDemoUsers();
    console.log('DB: Connection established and schemas verified');
  }
  return db;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function seedDemoUsers() {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (userCount === 0) {
    console.log('Seeding demo users...');
    const adminId = 'cc06b8c9-76e9-4e78-be75-2d4e9d722de8'; // Consistent UUIDs
    const studentId = 'cc06b8c9-76e9-4e78-be75-2d4e9d722de9';
    const iskandarId = 'd80c2827-f876-4755-9b1f-c2a6e54e8231';

    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, passwordHash, role, subscriptionStatus, createdAt, subscriptionDuration, productName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(adminId, 'Admin', 'admin@medbank.local', hashPassword('admin123'), 'admin', 'active', new Date().toISOString(), 365, 'Admin Access');
    stmt.run(studentId, 'Student', 'student@medbank.local', hashPassword('student123'), 'student', 'trial', new Date().toISOString(), 3, 'Free Trial');
    stmt.run(iskandarId, 'Iskandar', 'e@medbank.local', hashPassword('student123'), 'student', 'trial', new Date().toISOString(), 3, 'Free Trial');
    console.log('Demo users seeded');
  }

  // Independent Seed for subscription_packages
  try {
    const packageCount = db.prepare('SELECT COUNT(*) as count FROM subscription_packages').get().count;
    if (packageCount === 0) {
      console.log('Seeding subscription packages...');
      const stmt = db.prepare('INSERT INTO subscription_packages (name, duration_days, price, description, createdAt) VALUES (?, ?, ?, ?, ?)');
      stmt.run('90-Day QBank Subscription', 90, 49.99, 'Full access to medical QBank for 90 days.', new Date().toISOString());
      stmt.run('180-Day QBank Subscription', 180, 89.99, 'Full access to medical QBank for 180 days.', new Date().toISOString());
      stmt.run('365-Day QBank Subscription', 365, 149.99, 'Full access to medical QBank for 365 days.', new Date().toISOString());
      console.log('Subscription packages seeded');
    }
  } catch (err) {
    console.error('Error seeding subscription packages:', err.message);
  }
}

function initializeSchema() {
  const database = db;

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      subscriptionStatus TEXT DEFAULT 'trial',
      purchased INTEGER DEFAULT 0,
      activatedByPurchase INTEGER DEFAULT 0,
      hasPendingPurchase INTEGER DEFAULT 0,
      trialUsed INTEGER DEFAULT 0,
      activatedAt TEXT,
      expiresAt TEXT,
      lastRenewedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      isBanned INTEGER DEFAULT 0,
      stats TEXT DEFAULT '{"attempted":0,"correct":0,"tests":0}',
      pendingDuration INTEGER DEFAULT 0,
      subscriptionDuration INTEGER DEFAULT 0,
      productName TEXT
    )
  `);

  // Migrate users table for existing databases (add new columns if missing)
  const userColumnsToAdd = [
    { name: 'pendingDuration', type: 'INTEGER DEFAULT 0' },
    { name: 'subscriptionDuration', type: 'INTEGER DEFAULT 0' },
    { name: 'productName', type: 'TEXT' },
    { name: 'purchasedProducts', type: "TEXT DEFAULT '[]'" }
  ];
  const existingUserCols = database.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  for (const col of userColumnsToAdd) {
    if (!existingUserCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to users table`);
      } catch (err) {
        console.warn(`Could not add column ${col.name} to users:`, err.message);
      }
    }
  }

  // Questions table (global library) - Expanded for Authoring
  database.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      stem TEXT NOT NULL,
      stemImage TEXT DEFAULT '{}',
      choices TEXT NOT NULL,
      correct TEXT NOT NULL,
      explanation TEXT,
      explanationCorrect TEXT,
      explanationCorrectImage TEXT DEFAULT '{}',
      explanationWrong TEXT,
      explanationWrongImage TEXT DEFAULT '{}',
      summary TEXT,
      summaryImage TEXT DEFAULT '{}',
      subject TEXT,
      system TEXT,
      topic TEXT,
      cognitiveLevel TEXT DEFAULT 'understanding',
      type TEXT DEFAULT 'multiple-choice',
      published INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      "references" TEXT,
      tags TEXT DEFAULT '[]',
      version INTEGER DEFAULT 1,
      stemImageMode TEXT DEFAULT 'auto',
      explanationImageMode TEXT DEFAULT 'auto',
      packageId TEXT,
      productId TEXT,
      conceptId TEXT, -- Link to eternal Question Concept
      status TEXT DEFAULT 'draft', -- draft, published, archived, deprecated
      versionNumber INTEGER DEFAULT 1,
      isLatest INTEGER DEFAULT 1,
      globalAttempts INTEGER DEFAULT 0,
      globalCorrect INTEGER DEFAULT 0,
      choiceDistribution TEXT DEFAULT '{}',
      totalTimeSpent INTEGER DEFAULT 0, -- Total seconds across all users
      totalVolatility INTEGER DEFAULT 0, -- Total answer changes across all users
      totalStrikes INTEGER DEFAULT 0,
      totalMarks INTEGER DEFAULT 0
    )
  `);

  // NEW: Question Concepts Table (The eternal learning objective)
  database.exec(`
    CREATE TABLE IF NOT EXISTS question_concepts (
      id TEXT PRIMARY KEY,
      packageId TEXT,
      productId TEXT,
      system TEXT,
      subject TEXT,
      topic TEXT,
      tags TEXT DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `);

  // Migrate schema for existing databases (idempotent addition of new columns)
  const columnsToAdd = [
    { name: 'stemImage', type: 'TEXT DEFAULT "{}"' },
    { name: 'explanationCorrect', type: 'TEXT' },
    { name: 'explanationCorrectImage', type: 'TEXT DEFAULT "{}"' },
    { name: 'explanationWrong', type: 'TEXT' },
    { name: 'explanationWrongImage', type: 'TEXT DEFAULT "{}"' },
    { name: 'summary', type: 'TEXT' },
    { name: 'summaryImage', type: 'TEXT DEFAULT "{}"' },
    { name: 'topic', type: 'TEXT' },
    { name: 'cognitiveLevel', type: 'TEXT DEFAULT "understanding"' },
    { name: 'type', type: 'TEXT DEFAULT "multiple-choice"' },
    { name: 'references', type: 'TEXT' },
    { name: 'tags', type: 'TEXT DEFAULT "[]"' },
    { name: 'version', type: 'INTEGER DEFAULT 1' },
    { name: 'stemImageMode', type: 'TEXT DEFAULT "auto"' },
    { name: 'explanationImageMode', type: 'TEXT DEFAULT "auto"' },
    { name: 'packageId', type: 'TEXT' },
    { name: 'productId', type: 'TEXT' },
    { name: 'gallery', type: "TEXT DEFAULT '{}'" },
    { name: 'matrixColumns', type: "TEXT DEFAULT '[]'" },
    { name: 'matrixPlacement', type: "TEXT DEFAULT 'after'" },
    { name: 'hideOptionText', type: "INTEGER DEFAULT 0" }
  ];

  const existingCols = database.prepare("PRAGMA table_info(questions)").all().map(c => c.name);
  for (const col of columnsToAdd) {
    if (!existingCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE questions ADD COLUMN "${col.name}" ${col.type}`);
        console.log(`Added column ${col.name} to questions table`);
      } catch (err) {
        console.warn(`Could not add column ${col.name}:`, err.message);
      }
    }
  }

  // Lifecycle & Versioning columns
  const lifecycleCols = [
      { name: 'conceptId', type: 'TEXT' },
      { name: 'status', type: "TEXT DEFAULT 'draft'" },
      { name: 'versionNumber', type: 'INTEGER DEFAULT 1' },
      { name: 'isLatest', type: 'INTEGER DEFAULT 1' },
      { name: 'globalAttempts', type: 'INTEGER DEFAULT 0' },
      { name: 'globalCorrect', type: 'INTEGER DEFAULT 0' },
      { name: 'choiceDistribution', type: "TEXT DEFAULT '{}'" },
      { name: 'totalTimeSpent', type: 'INTEGER DEFAULT 0' },
      { name: 'totalVolatility', type: 'INTEGER DEFAULT 0' },
      { name: 'totalStrikes', type: 'INTEGER DEFAULT 0' },
      { name: 'totalMarks', type: 'INTEGER DEFAULT 0' }
  ];
  for (const col of lifecycleCols) {
      if (!existingCols.includes(col.name)) {
          database.exec(`ALTER TABLE questions ADD COLUMN ${col.name} ${col.type}`);
      }
  }

  // ONE-TIME MIGRATION: Bind existing questions to concepts
  const unlinkedCount = database.prepare("SELECT COUNT(*) as count FROM questions WHERE conceptId IS NULL").get().count;
  if (unlinkedCount > 0) {
      console.log(`MIGRATION: Linking ${unlinkedCount} questions to parent concepts...`);
      const questions = database.prepare("SELECT id, packageId, system, subject, topic, tags, createdAt, published FROM questions WHERE conceptId IS NULL").all();
      
      const insertConcept = database.prepare(`
          INSERT INTO question_concepts (id, packageId, system, subject, topic, tags, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const updateVersion = database.prepare(`
          UPDATE questions SET conceptId = ?, status = ?, versionNumber = ?, isLatest = 1 WHERE id = ?
      `);

      database.transaction(() => {
          for (const q of questions) {
              const conceptId = `concept_${q.id}`; // Stable legacy mapping
              insertConcept.run(conceptId, q.packageId, q.system, q.subject, q.topic, q.tags, q.createdAt);
              updateVersion.run(conceptId, q.published ? 'published' : 'draft', 1, q.id);
          }
      })();
      console.log("MIGRATION: Concept mapping complete.");
  }

  // User question progress (per-user stats for each question)
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      questionId TEXT NOT NULL,
      packageId TEXT,
      productId TEXT,
      status TEXT, -- NULL (in-progress), 'correct', 'incorrect', 'omitted'
      isMarked INTEGER DEFAULT 0,
      userAnswer TEXT,
      userHistory TEXT DEFAULT '[]',

      -- NEW: Usage-State Logic (Professional QBank Semantics)
      firstResponse TEXT,       -- Frozen at first attempt
      firstIsCorrect INTEGER,   -- Frozen at first attempt
      totalAttempts INTEGER DEFAULT 0,
      timeSpent INTEGER DEFAULT 0,
      lastAnswer TEXT,
      lastSeenAt TEXT,
      updatedAt TEXT,
      lastUpdated TEXT,

      UNIQUE(userId, questionId, packageId, productId)
    )
  `);

  // Migrate user_questions table
  const uqCols = database.prepare("PRAGMA table_info(user_questions)").all().map(c => c.name);
  const uqColsToAdd = [
    { name: 'packageId', type: 'TEXT' },
    { name: 'totalAttempts', type: 'INTEGER DEFAULT 0' },
    { name: 'timeSpent', type: 'INTEGER DEFAULT 0' },
    { name: 'lastAnswer', type: 'TEXT' },
    { name: 'lastSeenAt', type: 'TEXT' },
    { name: 'updatedAt', type: 'TEXT' },
    { name: 'lastUpdated', type: 'TEXT' }
  ];
  for (const col of uqColsToAdd) {
    if (!uqCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE user_questions ADD COLUMN ${col.name} ${col.type}`);
      } catch(e) {
        console.warn(`Migration: Could not add ${col.name} to user_questions:`, e.message);
      }
    }
  }

  // Ensure productId exists in user_questions
  if (!uqCols.includes('productId')) {
    try { database.exec('ALTER TABLE user_questions ADD COLUMN productId TEXT'); } catch(e) {}
  }

  // Intelligence Engine: Student Cognition Profiles
  database.exec(`
    CREATE TABLE IF NOT EXISTS student_cognition_profiles (
      userId TEXT NOT NULL,
      packageId TEXT NOT NULL,
      readinessScore REAL DEFAULT 0,
      overthinkingIndex REAL DEFAULT 0,
      impulsivityIndex REAL DEFAULT 0,
      fatigueFactor REAL DEFAULT 0,
      systemPerformance TEXT DEFAULT '{}',
      topWeaknessConcepts TEXT DEFAULT '[]',
      updatedAt TEXT,
      PRIMARY KEY (userId, packageId),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Intelligence Engine: Calibrated Item Intelligence
  database.exec(`
    CREATE TABLE IF NOT EXISTS calibrated_item_intelligence (
      questionId TEXT PRIMARY KEY,
      trapOption TEXT,
      confusionIndex REAL DEFAULT 0,
      misleadingSignal INTEGER DEFAULT 0,
      updatedAt TEXT,
      FOREIGN KEY (questionId) REFERENCES questions(id)
    )
  `);

  // Intelligence Engine: Calibrated Item Intelligence
  database.exec(`
    CREATE TABLE IF NOT EXISTS calibrated_item_intelligence (
      questionId TEXT PRIMARY KEY,
      trapOption TEXT,
      confusionIndex REAL DEFAULT 0,
      misleadingSignal INTEGER DEFAULT 0,
      updatedAt TEXT,
      FOREIGN KEY (questionId) REFERENCES questions(id)
    )
  `);

  // Tests table
  database.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      testId TEXT PRIMARY KEY,
      testNumber INTEGER,
      userId TEXT NOT NULL,
      mode TEXT,
      pool TEXT, -- JSON of all eligible IDs at creation
      questions TEXT NOT NULL, -- JSON array of selected IDs
      answers TEXT DEFAULT '{}',
      firstAnswers TEXT DEFAULT '{}',
      markedIds TEXT DEFAULT '[]',
      currentIndex INTEGER DEFAULT 0,
      elapsedTime INTEGER DEFAULT 0,
      isSuspended INTEGER DEFAULT 0,
      packageId TEXT,
      createdAt TEXT NOT NULL,
      date TEXT NOT NULL,

      -- NEW: Exam Runtime Engine
      sessionState TEXT DEFAULT '{}', -- Full JSON state (history, strikes, logs)
      
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  
  // Student Answers (Per-product isolation)
  database.exec(`
    CREATE TABLE IF NOT EXISTS student_answers (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      testId TEXT NOT NULL,
      productId TEXT NOT NULL,
      packageId TEXT,
      questionId TEXT NOT NULL,
      answer TEXT,
      isCorrect INTEGER,
      answeredAt TEXT DEFAULT CURRENT_TIMESTAMP,
      answerData TEXT,
      submittedAt TEXT
    );
  `);

  // Migrate tests table
  const tCols = database.prepare("PRAGMA table_info(tests)").all().map(c => c.name);
  const tColsToAdd = [
    { name: 'universeSize', type: 'INTEGER' },
    { name: 'eligiblePoolSize', type: 'INTEGER' },
    { name: 'poolLogic', type: 'TEXT' },
    { name: 'sessionState', type: "TEXT DEFAULT '{}'" }
  ];
  for (const col of tColsToAdd) {
    if (!tCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE tests ADD COLUMN ${col.name} ${col.type}`);
      } catch(e) {
        console.warn(`Migration: Could not add ${col.name} to tests:`, e.message);
      }
    }
  }

  // Migrate tests table
  const testColsToAdd = [
    { name: 'packageId', type: 'TEXT' },
    { name: 'packageName', type: 'TEXT' },
    { name: 'productId', type: 'TEXT' }
  ];
  const existingTestCols = database.prepare("PRAGMA table_info(tests)").all().map(c => c.name);
  for (const col of testColsToAdd) {
    if (!existingTestCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE tests ADD COLUMN ${col.name} ${col.type}`);
      } catch (e) {}
    }
  }

  // Planner table
  database.exec(`
    CREATE TABLE IF NOT EXISTS planner (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      dueDate TEXT,
      completed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Archive Tables for Data Retention & Restoration
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_questions_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      questionId TEXT NOT NULL,
      packageId TEXT,
      status TEXT,
      isMarked INTEGER,
      userAnswer TEXT,
      userHistory TEXT,
      archivedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tests_archive (
      testId TEXT PRIMARY KEY,
      testNumber INTEGER,
      userId TEXT NOT NULL,
      mode TEXT,
      pool TEXT,
      questions TEXT NOT NULL,
      answers TEXT,
      firstAnswers TEXT,
      markedIds TEXT,
      currentIndex INTEGER,
      elapsedTime INTEGER,
      isSuspended INTEGER,
      packageId TEXT,
      createdAt TEXT NOT NULL,
      date TEXT NOT NULL,
      archivedAt TEXT NOT NULL
    );
  `);

  // Migrate user_questions_archive
  const uqaCols = database.prepare("PRAGMA table_info(user_questions_archive)").all().map(c => c.name);
  if (!uqaCols.includes('packageId')) {
      try {
          database.exec(`ALTER TABLE user_questions_archive ADD COLUMN packageId TEXT`);
      } catch(e) {}
  }

  // Migrate tests_archive table
  const existingArchiveCols = database.prepare("PRAGMA table_info(tests_archive)").all().map(c => c.name);
  const archiveColsToAdd = [{ name: 'packageId', type: 'TEXT' }, { name: 'packageName', type: 'TEXT' }];
  for (const col of archiveColsToAdd) {
    if (!existingArchiveCols.includes(col.name)) {
        try {
            database.exec(`ALTER TABLE tests_archive ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {}
    }
  }

  // Products table (The central offering)
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      isActive INTEGER DEFAULT 1,
      is_published INTEGER DEFAULT 1,
      isDeleted INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT,
      deletedAt TEXT,
      duration_days INTEGER DEFAULT 0,
      templateType TEXT DEFAULT 'DEFAULT',
      defaultCreateTestConfig TEXT DEFAULT '{}',
      systems TEXT DEFAULT '[]',
      subjects TEXT DEFAULT '[]',
      plans TEXT DEFAULT '[]'
    )
  `);

  // Migrate products table for existing databases
  const prodCols = database.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  const prodColsToAdd = [
    { name: 'is_published', type: 'INTEGER DEFAULT 1' },
    { name: 'isDeleted', type: 'INTEGER DEFAULT 0' },
    { name: 'deletedAt', type: 'TEXT' },
    { name: 'templateType', type: "TEXT DEFAULT 'DEFAULT'" },
    { name: 'defaultCreateTestConfig', type: "TEXT DEFAULT '{}'" }
  ];
  for (const col of prodColsToAdd) {
    if (!prodCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
      } catch (e) { }
    }
  }

  // Subscription Packages table - Multi-plan support
  database.exec(`
    CREATE TABLE IF NOT EXISTS subscription_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      systems TEXT DEFAULT '[]',
      subjects TEXT DEFAULT '[]',
      plans TEXT DEFAULT '[]',
      defaultCreateTestConfig TEXT,
      is_published INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL
    )
  `);

  // User feedback table
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT NOT NULL, -- create_test, test_session, portal
      questionId TEXT,
      testId TEXT,
      page TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Migrate subscription_packages for custom systems/subjects/plans
  const packageColsToAdd = [
    { name: 'systems', type: "TEXT DEFAULT '[]'" },
    { name: 'subjects', type: "TEXT DEFAULT '[]'" },
    { name: 'plans', type: "TEXT DEFAULT '[]'" },
    { name: 'defaultCreateTestConfig', type: 'TEXT' }
  ];
  const existingPkgCols = database.prepare("PRAGMA table_info(subscription_packages)").all().map(c => c.name);
  for (const col of packageColsToAdd) {
    if (!existingPkgCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE subscription_packages ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to subscription_packages table`);
      } catch (err) {
        console.warn(`Could not add column ${col.name} to subscription_packages:`, err.message);
      }
    }
  }


  // Notifications table
  database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'registration', 'purchase', 'alert'
      message TEXT NOT NULL,
      userId TEXT,
      metadata TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  // NEW: Governance History Table
  database.exec(`
    CREATE TABLE IF NOT EXISTS governance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      versionId TEXT NOT NULL,
      conceptId TEXT NOT NULL,
      fromState TEXT,
      toState TEXT NOT NULL,
      performedBy TEXT NOT NULL,
      performedAt TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (versionId) REFERENCES questions(id),
      FOREIGN KEY (conceptId) REFERENCES question_concepts(id)
    )
  `);

 
  // --- START: Standardized Subscription Registry (Multi-subscription support) ---

  // Migration: Rename old table if exists
  const tableCheck = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_subscriptions'")
    .get();

  if (tableCheck) {
    try {
      database.exec(`ALTER TABLE user_subscriptions RENAME TO subscriptions;`);
      console.log('Renamed user_subscriptions to subscriptions');

      // Rename purchaseDate if needed
      const subCols = database.prepare("PRAGMA table_info(subscriptions)").all().map(c => c.name);
      if (subCols.includes('createdAt') && !subCols.includes('purchaseDate')) {
        database.exec(`ALTER TABLE subscriptions RENAME COLUMN createdAt TO purchaseDate;`);
        console.log('Renamed subscriptions.createdAt to purchaseDate');
      }
    } catch (e) {
      console.warn('Migration warning:', e.message);
    }
  }

  // Ensure subscriptions table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      packageId TEXT,
      productName TEXT,
      durationDays INTEGER NOT NULL,
      amount REAL DEFAULT 0,
      startDate TEXT,
      expiresAt TEXT,
      status TEXT DEFAULT 'pending'
    );
  `);

  // Add packageId column if it doesn't exist
  const columnExists = database
    .prepare("PRAGMA table_info(subscriptions);")
    .all()
    .some(col => col.name === "packageId");

  if (!columnExists) {
    database.exec(`ALTER TABLE subscriptions ADD COLUMN packageId TEXT;`);
    console.log("Column packageId added to subscriptions table.");
  } else {
    console.log("Column packageId already exists.");
  }

  // Optional: check type of packageId for safety
  const subInfo = database.prepare("PRAGMA table_info(subscriptions)").all();
  const pkgIdCol = subInfo.find(c => c.name === 'packageId');
  if (pkgIdCol && pkgIdCol.type.toUpperCase() === 'INTEGER') {
    console.warn('Subscriptions.packageId is INTEGER, treating as TEXT in code.');
  }

  // --- END: Subscription Registry ---

  // Add isDeleted column for soft delete functionality
  const productColsToAdd = [
    { name: 'isDeleted', type: 'INTEGER DEFAULT 0' },
    { name: 'deletedAt', type: 'TEXT' },
    { name: 'templateType', type: "TEXT DEFAULT 'DEFAULT'" }
  ];
  const existingProductCols = database.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  for (const col of productColsToAdd) {
    if (!existingProductCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to products table`);
      } catch (err) {
        console.warn(`Could not add column ${col.name} to products:`, err.message);
      }
    }
  }

  // Indexes for Performance and Governance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_conceptId ON questions(conceptId);
    CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
    CREATE INDEX IF NOT EXISTS idx_questions_packageId ON questions(packageId);
    CREATE INDEX IF NOT EXISTS idx_questions_productId ON questions(productId);
    CREATE INDEX IF NOT EXISTS idx_governance_history_versionId ON governance_history(versionId);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions(userId);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_packageId ON subscriptions(packageId);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_productId ON subscriptions(productId);
    CREATE INDEX IF NOT EXISTS idx_user_feedback_userId ON user_feedback(userId);
    CREATE INDEX IF NOT EXISTS idx_tests_productId ON tests(productId);
    CREATE INDEX IF NOT EXISTS idx_tests_packageId ON tests(packageId);
    CREATE INDEX IF NOT EXISTS idx_student_answers_productId ON student_answers(productId);
  `);

  // NEW: Test Attempts (Per-session results snapshot)
  database.exec(`
    CREATE TABLE IF NOT EXISTS test_attempts (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      userId TEXT NOT NULL,
      testId TEXT, -- Link to original test session
      startedAt TEXT NOT NULL,
      finishedAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Migrate test_attempts snapshot columns
  const taCols = database.prepare("PRAGMA table_info(test_attempts)").all().map(c => c.name);
  const taColsToAdd = [
    { name: 'questionIds', type: 'TEXT' },
    { name: 'markedIds', type: 'TEXT' },
    { name: 'timeSpent', type: 'TEXT' },
    { name: 'elapsedTime', type: 'INTEGER DEFAULT 0' },
    { name: 'questionSnapshots', type: 'TEXT' }
  ];
  for (const col of taColsToAdd) {
    if (!taCols.includes(col.name)) {
      try {
        database.exec(`ALTER TABLE test_attempts ADD COLUMN ${col.name} ${col.type}`);
      } catch (e) {
        console.warn(`Migration: Could not add ${col.name} to test_attempts:`, e.message);
      }
    }
  }

  // NEW: Test Answers (Detailed question-level breakdown for an attempt)
  database.exec(`
    CREATE TABLE IF NOT EXISTS test_answers (
      testAttemptId TEXT NOT NULL,
      questionId TEXT NOT NULL,
      selectedOption TEXT,
      isCorrect INTEGER,
      isFlagged INTEGER,
      FOREIGN KEY (testAttemptId) REFERENCES test_attempts(id)
    )
  `);

  // Migrate test_answers for timeSpent tracking
  const ansCols = database.prepare("PRAGMA table_info(test_answers)").all().map(c => c.name);
  if (!ansCols.includes('correctOption')) {
    try {
      database.exec('ALTER TABLE test_answers ADD COLUMN correctOption TEXT');
    } catch (e) {
      console.warn('Migration: Could not add correctOption to test_answers:', e.message);
    }
  }
  if (!ansCols.includes('timeSpentSec')) {
    try {
      database.exec('ALTER TABLE test_answers ADD COLUMN timeSpentSec INTEGER DEFAULT 0');
    } catch (e) {
      console.warn('Migration: Could not add timeSpentSec to test_answers:', e.message);
    }
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_test_answers_attemptId ON test_answers(testAttemptId);
  `);

  // Unique constraint to prevent duplicate active subscriptions
  // Removed UNIQUE index to allow subscription extension logic
  try {
    database.exec(`DROP INDEX IF EXISTS idx_unique_active_subscription`);
  } catch (e) {}

  // View for product-isolated student answers (joins with tests for consistency)
  database.exec(`
    CREATE VIEW IF NOT EXISTS student_answers_per_product AS
    SELECT sa.*, t.packageName, t.mode, t.date as testDate
    FROM student_answers sa
    JOIN tests t ON sa.testId = t.testId;
  `);

  console.log('Database schema initialized');
}
