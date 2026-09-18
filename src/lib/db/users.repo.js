import crypto from "crypto";
import { getDb } from "../server-db";

export function createUser(user) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, passwordHash, role, subscriptionStatus, createdAt, stats, pendingDuration, subscriptionDuration, productName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    user.id,
    user.name,
    user.email,
    user.passwordHash,
    user.role || "student",
    user.subscriptionStatus || "trial",
    user.createdAt || new Date().toISOString(),
    JSON.stringify(user.stats || { attempted: 0, correct: 0, tests: 0 }),
    user.pendingDuration || 0,
    user.subscriptionDuration || 0,
    user.productName || null
  );
  return user;
}

export function getUserByEmail(email) {
  const db = getDb();
  const trimmedEmail = (email || "").trim();
  const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
  const user = stmt.get(trimmedEmail);
  if (user) {
    user.stats = JSON.parse(user.stats || "{}");
    user.purchased = !!user.purchased;
    user.activatedByPurchase = !!user.activatedByPurchase;
    user.hasPendingPurchase = !!user.hasPendingPurchase;
    user.trialUsed = !!user.trialUsed;
    user.isBanned = !!user.isBanned;
  }
  return user;
}

export function getUserById(id) {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const user = stmt.get(id);
  if (user) {
    user.stats = JSON.parse(user.stats || "{}");
    user.purchased = !!user.purchased;
    user.activatedByPurchase = !!user.activatedByPurchase;
    user.hasPendingPurchase = !!user.hasPendingPurchase;
    user.trialUsed = !!user.trialUsed;
    user.isBanned = !!user.isBanned;
  }
  return user;
}

export function getAllUsers() {
  const db = getDb();
  const stmt = db.prepare("SELECT * FROM users");
  return stmt.all().map((user) => {
    user.stats = JSON.parse(user.stats || "{}");
    user.purchased = !!user.purchased;
    user.activatedByPurchase = !!user.activatedByPurchase;
    user.hasPendingPurchase = !!user.hasPendingPurchase;
    user.trialUsed = !!user.trialUsed;
    user.isBanned = !!user.isBanned;
    return user;
  });
}

export function updateUser(user) {
  const db = getDb();
  console.log("DB: Updating user record for ID:", user.id);

  if (!user.id) {
    throw new Error("Database error: User ID is required for update");
  }

  let statsString = "{}";
  if (user.stats) {
    if (typeof user.stats === "string") {
      statsString = user.stats;
    } else {
      statsString = JSON.stringify(user.stats);
    }
  }

  const stmt = db.prepare(`
    UPDATE users SET
      name = ?, email = ?, passwordHash = ?, role = ?,
      subscriptionStatus = ?, purchased = ?, activatedByPurchase = ?,
      hasPendingPurchase = ?, trialUsed = ?, activatedAt = ?,
      expiresAt = ?, lastRenewedAt = ?, updatedAt = ?, isBanned = ?, stats = ?,
      pendingDuration = ?, subscriptionDuration = ?, productName = ?
    WHERE id = ?
  `);

  const params = [
    user.name || "",
    user.email || "",
    user.passwordHash || "",
    user.role || "student",
    user.subscriptionStatus || "trial",
    user.purchased ? 1 : 0,
    user.activatedByPurchase ? 1 : 0,
    user.hasPendingPurchase ? 1 : 0,
    user.trialUsed ? 1 : 0,
    user.activatedAt || null,
    user.expiresAt || null,
    user.lastRenewedAt || null,
    new Date().toISOString(),
    user.isBanned ? 1 : 0,
    statsString,
    user.pendingDuration || 0,
    user.subscriptionDuration || 0,
    user.productName || null,
    user.id,
  ];

  console.log("DB: Executing UPDATE with", params.length, "parameters");
  const result = stmt.run(...params);

  if (result.changes === 0) {
    console.warn("DB: Update completed but 0 rows were affected for ID:", user.id);
  }

  return user;
}

export function deleteUser(id) {
  try {
    const db = getDb();

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!user) {
      throw new Error("User not found");
    }

    const deleteTx = db.transaction((userId) => {
      db.prepare("DELETE FROM subscriptions WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM user_questions WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM user_feedback WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM notifications WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM student_cognition_profiles WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM planner WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM user_questions_archive WHERE userId = ?").run(userId);
      db.prepare("DELETE FROM tests_archive WHERE userId = ?").run(userId);

      const testIds = db.prepare("SELECT testId FROM tests WHERE userId = ?").all(userId).map((t) => t.testId);
      if (testIds.length > 0) {
        const placeholders = testIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM student_answers WHERE testId IN (${placeholders})`).run(...testIds);
        db.prepare("DELETE FROM tests WHERE userId = ?").run(userId);
      }

      const attemptIds = db.prepare("SELECT id FROM test_attempts WHERE userId = ?").all(userId).map((a) => a.id);
      if (attemptIds.length > 0) {
        const placeholders = attemptIds.map(() => "?").join(",");
        db.prepare(`DELETE FROM test_answers WHERE testAttemptId IN (${placeholders})`).run(...attemptIds);
        try {
          db.prepare(`DELETE FROM test_attempt_answers WHERE attempt_id IN (${placeholders})`).run(...attemptIds);
        } catch (e) {}
        db.prepare("DELETE FROM test_attempts WHERE userId = ?").run(userId);
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    });

    deleteTx(id);
    console.log(`User ${id} ("${user.name}") PERMANENTLY purged from registry`);
    return true;
  } catch (err) {
    console.error(`DB: Failed to permanently delete user ${id}:`, err.message);
    throw err;
  }
}

export function createUserSubscription({ userId, packageId, productId, durationDays, amount = 0, status = "pending" }) {
  const db = getDb();

  const uidStr = String(userId);
  const pidStr = String(packageId || productId);

  console.log(`[Subscription Registry] Processing sub for user ${uidStr}, product ${pidStr}`);

  const product = db.prepare("SELECT isDeleted FROM products WHERE id = ?").get(pidStr);
  if (product && product.isDeleted) {
    throw new Error("Cannot create subscription for deleted product");
  }

  const existing = db
    .prepare(`
        SELECT * FROM subscriptions
        WHERE userId = ? AND packageId = ? AND status = 'active'
        ORDER BY expiresAt DESC LIMIT 1
    `)
    .get(uidStr, pidStr);

  if (existing) {
    const existingProduct = db.prepare("SELECT isDeleted FROM products WHERE id = ?").get(pidStr);
    if (existingProduct && existingProduct.isDeleted) {
      throw new Error("Cannot renew subscription for deleted product");
    }

    console.log(`[Subscription Registry] Found existing active sub ${existing.id}. Extending by ${durationDays} days.`);
    const currentExpiry = new Date(existing.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    db.prepare("UPDATE subscriptions SET expiresAt = ?, durationDays = durationDays + ?, amount = amount + ? WHERE id = ?").run(newExpiry.toISOString(), Number(durationDays), Number(amount), existing.id);

    return { ...existing, expiresAt: newExpiry.toISOString(), extended: true };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const purchaseDate = now.toISOString();

  let expiresAt = null;
  if (status === "active") {
    expiresAt = new Date(now.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000).toISOString();
  }

  console.log(`[Subscription Registry] Inserting new sub ${id} (Status: ${status})`);
  db.prepare(`
        INSERT INTO subscriptions (id, userId, packageId, productId, status, expiresAt, purchaseDate, amount, durationDays)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, uidStr, pidStr, pidStr, status, expiresAt, purchaseDate, amount, durationDays);

  return { id, userId: uidStr, packageId: pidStr, productId: pidStr, durationDays, amount, status, expiresAt, purchaseDate };
}

export function getUserSubscriptions(userId) {
  const db = getDb();
  const uidStr = String(userId);
  console.log(`[Subscription Registry] Fetching subs for user ${uidStr}`);
  return db
    .prepare(`
        SELECT s.*, pr.name as productName, pr.isDeleted as productDeleted
        FROM subscriptions s
        LEFT JOIN products pr ON s.packageId = CAST(pr.id AS TEXT) OR s.productId = CAST(pr.id AS TEXT)
        WHERE s.userId = ?
        AND s.id IN (
            SELECT MAX(id)
            FROM subscriptions
            WHERE userId = ?
            GROUP BY packageId
        )
        ORDER BY s.purchaseDate DESC
    `)
    .all(uidStr, uidStr);
}

export function getActiveSubscriptionByUserAndProduct(userId, packageId) {
  const db = getDb();
  const pidStr = String(packageId);
  const uidStr = String(userId);
  return db
    .prepare(`
        SELECT * FROM subscriptions
        WHERE userId = ?
        AND (packageId = ? OR productId = ?)
        AND status = 'active'
        ORDER BY expiresAt DESC
        LIMIT 1
    `)
    .get(uidStr, pidStr, pidStr);
}

export function activateSubscription(subscriptionId) {
  const db = getDb();
  const sub = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(subscriptionId);
  if (!sub) throw new Error("Subscription not found");

  const now = new Date();
  const startDate = now.toISOString();
  const expiresAt = new Date(now.getTime() + sub.durationDays * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
        UPDATE subscriptions SET
            status = 'active',
            expiresAt = ?
        WHERE id = ?
    `).run(expiresAt, subscriptionId);

  const uidStr = String(sub.userId);
  const pidStr = String(sub.packageId);

  const user = db.prepare("SELECT purchasedProducts FROM users WHERE id = ?").get(uidStr);
  let ids = [];
  try {
    ids = JSON.parse(user?.purchasedProducts || "[]");
    if (!Array.isArray(ids)) ids = [];
  } catch (e) {
    ids = [];
  }

  if (!ids.includes(pidStr)) {
    ids.push(pidStr);
    db.prepare("UPDATE users SET purchasedProducts = ?, purchased = 1, activatedByPurchase = 1 WHERE id = ?").run(JSON.stringify(ids), uidStr);
  }

  return { ...sub, status: "active", startDate, expiresAt };
}

export function extendSubscription(subscriptionId, additionalDays) {
  const db = getDb();
  const sub = db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(subscriptionId);
  if (!sub) throw new Error("Subscription not found");

  const now = new Date();
  let newExpiresAt;

  if (sub.expiresAt && new Date(sub.expiresAt) > now) {
    newExpiresAt = new Date(new Date(sub.expiresAt).getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000);
  } else {
    newExpiresAt = new Date(now.getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000);
  }

  db.prepare(`
        UPDATE subscriptions SET
            status = 'active',
            expiresAt = ?
        WHERE id = ?
    `).run(newExpiresAt.toISOString(), subscriptionId);

  return { ...sub, status: "active", expiresAt: newExpiresAt.toISOString() };
}

export function createNotification(type, message, userId = null, metadata = null) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO notifications (type, message, userId, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(type, message, userId, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
    return info.lastInsertRowid;
  } catch (err) {
    console.error("DB: Failed to create notification:", err.message);
    return null;
  }
}

export function getNotifications(limit = 50, onlyUnread = false) {
  try {
    const db = getDb();
    let query = "SELECT * FROM notifications";
    if (onlyUnread) query += " WHERE isRead = 0";
    query += " ORDER BY createdAt DESC LIMIT ?";

    const stmt = db.prepare(query);
    return stmt.all(limit).map((n) => ({
      ...n,
      isRead: !!n.isRead,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));
  } catch (err) {
    console.error("DB: Failed to fetch notifications:", err.message);
    return [];
  }
}

export function markNotificationRead(id) {
  try {
    const db = getDb();
    db.prepare("UPDATE notifications SET isRead = 1 WHERE id = ?").run(id);
    return true;
  } catch (err) {
    console.error("DB: Failed to mark notification as read:", err.message);
    return false;
  }
}

export function createUserFeedback({ userId, message, source, questionId = null, testId = null, page = null }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_feedback (id, userId, message, source, questionId, testId, page, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(userId),
    String(message || "").trim(),
    String(source || "portal").trim(),
    questionId ? String(questionId) : null,
    testId ? String(testId) : null,
    page ? String(page) : null,
    createdAt
  );

  return { id, userId: String(userId), message: String(message || "").trim(), source, questionId, testId, page, createdAt };
}

export function getUserFeedback(userId, limit = 100) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, userId, message, source, questionId, testId, page, createdAt
    FROM user_feedback
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `).all(String(userId), Number(limit) || 100);

  return rows;
}

export function getFeedback(limit = 200) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.id, f.userId, f.message, f.source, f.questionId, f.testId, f.page, f.createdAt,
           u.name as userName, u.email as userEmail
    FROM user_feedback f
    LEFT JOIN users u ON u.id = f.userId
    ORDER BY f.createdAt DESC
    LIMIT ?
  `).all(Number(limit) || 200);

  return rows;
}

export function getUserUsageSummary(userId) {
  const db = getDb();

  const usage = db.prepare(`
    SELECT
      COUNT(DISTINCT questionId) as usedQuestions,
      SUM(CASE WHEN status = 'correct' OR status = 'incorrect' THEN 1 ELSE 0 END) as doneQuestions
    FROM user_questions
    WHERE userId = ?
  `).get(String(userId));

  return {
    usedQuestions: Number(usage?.usedQuestions || 0),
    doneQuestions: Number(usage?.doneQuestions || 0)
  };
}

export function getUserProductStats(userId, packageId) {
  if (!userId || !packageId) {
    console.warn("getUserProductStats called without userId or packageId");
    return { accuracy: 0, usage: 0, completedTests: 0, totalQuestions: 0, attemptedQuestions: 0 };
  }

  const db = getDb();
  const pidStr = packageId.toString();

  const productUniverse = db
    .prepare(`
    SELECT COUNT(*) as count
    FROM questions
    WHERE (CAST(productId AS TEXT) = CAST(? AS TEXT) OR CAST(packageId AS TEXT) = CAST(? AS TEXT))
    AND (status = 'published' OR published = 1)
  `)
    .get(pidStr, pidStr).count;

  const userProgress = db
    .prepare(`
    SELECT
      SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN status = 'incorrect' THEN 1 ELSE 0 END) as incorrect,
      SUM(CASE WHEN status = 'omitted' THEN 1 ELSE 0 END) as omitted,
      COUNT(DISTINCT questionId) as uniqueUsed
    FROM user_questions
    WHERE userId = ? AND (CAST(productId AS TEXT) = CAST(? AS TEXT) OR CAST(packageId AS TEXT) = CAST(? AS TEXT))
  `)
    .get(userId, pidStr, pidStr);

  const completedTests = db.prepare("SELECT COUNT(*) as count FROM tests WHERE userId = ? AND (productId = ? OR packageId = ?) AND isSuspended = 0").get(userId, pidStr, pidStr).count;

  const attempted = (userProgress.correct || 0) + (userProgress.incorrect || 0);
  const totalAnswered = attempted + (userProgress.omitted || 0);
  const accuracy = attempted > 0 ? Math.round((userProgress.correct / attempted) * 100) : 0;
  const usagePerc = productUniverse > 0 ? Math.round((userProgress.uniqueUsed / productUniverse) * 100) : 0;

  return {
    accuracy,
    usage: usagePerc,
    completedTests,
    totalQuestions: productUniverse,
    attemptedQuestions: attempted,
    totalAnswered,
    correctAnswers: userProgress.correct || 0,
    incorrectAnswers: userProgress.incorrect || 0,
    omittedAnswers: userProgress.omitted || 0,
    usedQuestions: userProgress.uniqueUsed || 0,
    unusedQuestions: Math.max(0, productUniverse - (userProgress.uniqueUsed || 0)),
  };
}
