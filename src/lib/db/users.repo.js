import crypto from "crypto";
import { queryOne, query, execute, transaction } from "../pg";

export async function createUser(user) {
  const result = await execute(`
    INSERT INTO "users" (id, name, email, "passwordHash", role, "subscriptionStatus", "createdAt", stats, "pendingDuration", "subscriptionDuration", "productName")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
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
  ]);
  return user;
}

export async function updateUserPasswordHash(id, passwordHash) {
  await execute(
    `UPDATE "users" SET "passwordHash" = $1, "updatedAt" = $2 WHERE CAST(id AS TEXT) = CAST($3 AS TEXT)`,
    [passwordHash, new Date().toISOString(), id]
  );
}

export async function getUserByEmail(email) {
  const trimmedEmail = (email || "").trim();
  const user = await queryOne(`SELECT * FROM "users" WHERE LOWER("email") = LOWER($1)`, [trimmedEmail]);
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

export async function getUserById(id) {
  const user = await queryOne(`SELECT * FROM "users" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
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

export async function getAllUsers() {
  const users = await query(`SELECT * FROM "users"`);
  return users.map((user) => {
    user.stats = JSON.parse(user.stats || "{}");
    user.purchased = !!user.purchased;
    user.activatedByPurchase = !!user.activatedByPurchase;
    user.hasPendingPurchase = !!user.hasPendingPurchase;
    user.trialUsed = !!user.trialUsed;
    user.isBanned = !!user.isBanned;
    return user;
  });
}

export async function updateUser(user) {
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

  const result = await execute(`
    UPDATE "users" SET
      name = $1, email = $2, "passwordHash" = $3, role = $4,
      "subscriptionStatus" = $5, purchased = $6, "activatedByPurchase" = $7,
      "hasPendingPurchase" = $8, "trialUsed" = $9, "activatedAt" = $10,
      "expiresAt" = $11, "lastRenewedAt" = $12, "updatedAt" = $13, "isBanned" = $14, stats = $15,
      "pendingDuration" = $16, "subscriptionDuration" = $17, "productName" = $18
    WHERE CAST(id AS TEXT) = CAST($19 AS TEXT)
  `, [
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
  ]);

  console.log("DB: Executing UPDATE with", 19, "parameters");
  if (result.rowCount === 0) {
    console.warn("DB: Update completed but 0 rows were affected for ID:", user.id);
  }

  return user;
}

export async function deleteUser(id) {
  try {
    const user = await queryOne(`SELECT * FROM "users" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
    if (!user) {
      throw new Error("User not found");
    }

    await transaction(async (client) => {
      await client.query(`DELETE FROM "subscriptions" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "user_questions" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "user_feedback" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "notifications" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "student_cognition_profiles" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "planner" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "user_questions_archive" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      await client.query(`DELETE FROM "tests_archive" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);

      const testIds = (await client.query(`SELECT "testId" FROM "tests" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id])).rows.map((t) => t.testId);
      if (testIds.length > 0) {
        const placeholders = testIds.map((_, i) => `$${i + 2}`).join(",");
        await client.query(`DELETE FROM "student_answers" WHERE CAST("testId" AS TEXT) IN (${placeholders})`, [id, ...testIds]);
        await client.query(`DELETE FROM "tests" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      }

      const attemptIds = (await client.query(`SELECT id FROM "test_attempts" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id])).rows.map((a) => a.id);
      if (attemptIds.length > 0) {
        const placeholders = attemptIds.map((_, i) => `$${i + 2}`).join(",");
        await client.query(`DELETE FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) IN (${placeholders})`, [id, ...attemptIds]);
        try {
          await client.query(`DELETE FROM "test_attempt_answers" WHERE CAST("attempt_id" AS TEXT) IN (${placeholders})`, [id, ...attemptIds]);
        } catch (e) {}
        await client.query(`DELETE FROM "test_attempts" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [id]);
      }

      await client.query(`DELETE FROM "users" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
    });

    console.log(`User ${id} ("${user.name}") PERMANENTLY purged from registry`);
    return true;
  } catch (err) {
    console.error(`DB: Failed to permanently delete user ${id}:`, err.message);
    throw err;
  }
}

export async function createUserSubscription({ userId, packageId, productId, durationDays, amount = 0, status = "pending" }) {
  const uidStr = String(userId);
  const pidStr = String(packageId || productId);

  console.log(`[Subscription Registry] Processing sub for user ${uidStr}, product ${pidStr}`);

  const product = await queryOne(`SELECT "isDeleted" FROM "products" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [pidStr]);
  if (product && product.isDeleted) {
    throw new Error("Cannot create subscription for deleted product");
  }

  const existing = await queryOne(`
        SELECT * FROM "subscriptions"
        WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND CAST("packageId" AS TEXT) = CAST($2 AS TEXT) AND status = 'active'
        ORDER BY "expiresAt" DESC LIMIT 1
    `, [uidStr, pidStr]);

  if (existing) {
    const existingProduct = await queryOne(`SELECT "isDeleted" FROM "products" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [pidStr]);
    if (existingProduct && existingProduct.isDeleted) {
      throw new Error("Cannot renew subscription for deleted product");
    }

    console.log(`[Subscription Registry] Found existing active sub ${existing.id}. Extending by ${durationDays} days.`);
    const currentExpiry = new Date(existing.expiresAt);
    const newExpiry = new Date(currentExpiry.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    await execute(`UPDATE "subscriptions" SET "expiresAt" = $1, "durationDays" = "durationDays" + $2, amount = amount + $3 WHERE CAST(id AS TEXT) = CAST($4 AS TEXT)`, [newExpiry.toISOString(), Number(durationDays), Number(amount), existing.id]);

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
  await execute(`
        INSERT INTO "subscriptions" (id, "userId", "packageId", "productId", status, "expiresAt", "purchaseDate", amount, "durationDays")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, uidStr, pidStr, pidStr, status, expiresAt, purchaseDate, amount, durationDays]);

  return { id, userId: uidStr, packageId: pidStr, productId: pidStr, durationDays, amount, status, expiresAt, purchaseDate };
}

export async function getUserSubscriptions(userId) {
  const uidStr = String(userId);
  console.log(`[Subscription Registry] Fetching subs for user ${uidStr}`);
  return await query(`
        SELECT s.*, pr.name as "productName", pr."isDeleted" as "productDeleted"
        FROM "subscriptions" s
        LEFT JOIN "products" pr ON CAST(s."packageId" AS TEXT) = CAST(pr.id AS TEXT) OR CAST(s."productId" AS TEXT) = CAST(pr.id AS TEXT)
        WHERE CAST(s."userId" AS TEXT) = CAST($1 AS TEXT)
        AND s.id IN (
            SELECT MAX(id)
            FROM "subscriptions"
            WHERE CAST("userId" AS TEXT) = CAST($2 AS TEXT)
            GROUP BY "packageId"
        )
        ORDER BY s."purchaseDate" DESC
    `, [uidStr, uidStr]);
}

export async function getActiveSubscriptionByUserAndProduct(userId, packageId) {
  const pidStr = String(packageId);
  const uidStr = String(userId);
  return await queryOne(`
        SELECT * FROM "subscriptions"
        WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)
        AND (CAST("packageId" AS TEXT) = CAST($2 AS TEXT) OR CAST("productId" AS TEXT) = CAST($3 AS TEXT))
        AND status = 'active'
        ORDER BY "expiresAt" DESC
        LIMIT 1
    `, [uidStr, pidStr, pidStr]);
}

export async function activateSubscription(subscriptionId) {
  const sub = await queryOne(`SELECT * FROM "subscriptions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [subscriptionId]);
  if (!sub) throw new Error("Subscription not found");

  const now = new Date();
  const startDate = now.toISOString();
  const expiresAt = new Date(now.getTime() + sub.durationDays * 24 * 60 * 60 * 1000).toISOString();

  await execute(`
        UPDATE "subscriptions" SET
            status = 'active',
            "expiresAt" = $1
        WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)
    `, [expiresAt, subscriptionId]);

  const uidStr = String(sub.userId);
  const pidStr = String(sub.packageId);

  const user = await queryOne(`SELECT "purchasedProducts" FROM "users" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [uidStr]);
  let ids = [];
  try {
    ids = JSON.parse(user?.purchasedProducts || "[]");
    if (!Array.isArray(ids)) ids = [];
  } catch (e) {
    ids = [];
  }

  if (!ids.includes(pidStr)) {
    ids.push(pidStr);
    await execute(`UPDATE "users" SET "purchasedProducts" = $1, purchased = 1, "activatedByPurchase" = 1 WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)`, [JSON.stringify(ids), uidStr]);
  }

  return { ...sub, status: "active", startDate, expiresAt };
}

export async function extendSubscription(subscriptionId, additionalDays) {
  const sub = await queryOne(`SELECT * FROM "subscriptions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [subscriptionId]);
  if (!sub) throw new Error("Subscription not found");

  const now = new Date();
  let newExpiresAt;

  if (sub.expiresAt && new Date(sub.expiresAt) > now) {
    newExpiresAt = new Date(new Date(sub.expiresAt).getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000);
  } else {
    newExpiresAt = new Date(now.getTime() + Number(additionalDays) * 24 * 60 * 60 * 1000);
  }

  await execute(`
        UPDATE "subscriptions" SET
            status = 'active',
            "expiresAt" = $1
        WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)
    `, [newExpiresAt.toISOString(), subscriptionId]);

  return { ...sub, status: "active", expiresAt: newExpiresAt.toISOString() };
}

export async function createNotification(type, message, userId = null, metadata = null) {
  try {
    const result = await execute(`
      INSERT INTO "notifications" (type, message, "userId", metadata, "createdAt")
      VALUES ($1, $2, $3, $4, $5)
    `, [type, message, userId, metadata ? JSON.stringify(metadata) : null, new Date().toISOString()]);
    return result;
  } catch (err) {
    console.error("DB: Failed to create notification:", err.message);
    return null;
  }
}

export async function getNotifications(userId = null, limit = 50, onlyUnread = false) {
  try {
    let sql = `SELECT * FROM "notifications"`;
    const params = [];
    if (onlyUnread) {
      sql += ` WHERE "isRead" = 0`;
    }
    if (userId) {
      sql += onlyUnread ? ` AND CAST("userId" AS TEXT) = CAST($${params.length + 1} AS TEXT)` : ` WHERE CAST("userId" AS TEXT) = CAST($${params.length + 1} AS TEXT)`;
      params.push(userId);
    }
    sql += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await query(sql, params);
    return rows.map((n) => ({
      ...n,
      isRead: !!n.isRead,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));
  } catch (err) {
    console.error("DB: Failed to fetch notifications:", err.message);
    return [];
  }
}

export async function markNotificationRead(id) {
  try {
    await execute(`UPDATE "notifications" SET "isRead" = 1 WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
    return true;
  } catch (err) {
    console.error("DB: Failed to mark notification as read:", err.message);
    return false;
  }
}

export async function getNotificationById(id) {
  try {
    const row = await queryOne(`SELECT * FROM "notifications" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
    if (!row) return null;
    return {
      ...row,
      isRead: !!row.isRead,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    };
  } catch (err) {
    console.error("DB: Failed to fetch notification by id:", err.message);
    return null;
  }
}

export async function createUserFeedback({ userId, message, source, questionId = null, testId = null, page = null }) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await execute(`
    INSERT INTO "user_feedback" (id, "userId", message, source, "questionId", "testId", page, "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    String(userId),
    String(message || "").trim(),
    String(source || "portal").trim(),
    questionId ? String(questionId) : null,
    testId ? String(testId) : null,
    page ? String(page) : null,
    createdAt
  ]);

  return { id, userId: String(userId), message: String(message || "").trim(), source, questionId, testId, page, createdAt };
}

export async function getUserFeedback(userId, limit = 100) {
  const rows = await query(`
    SELECT id, "userId", message, source, "questionId", "testId", page, "createdAt"
    FROM "user_feedback"
    WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)
    ORDER BY "createdAt" DESC
    LIMIT $2
  `, [String(userId), Number(limit) || 100]);

  return rows;
}

export async function getFeedback(limit = 200) {
  const rows = await query(`
    SELECT f.id, f."userId", f.message, f.source, f."questionId", f."testId", f.page, f."createdAt",
           u.name as "userName", u.email as "userEmail"
    FROM "user_feedback" f
    LEFT JOIN "users" u ON CAST(u.id AS TEXT) = CAST(f."userId" AS TEXT)
    ORDER BY f."createdAt" DESC
    LIMIT $1
  `, [Number(limit) || 200]);

  return rows;
}

export async function getUserUsageSummary(userId) {
  const usage = await queryOne(`
    SELECT
      COUNT(DISTINCT "questionId") as "usedQuestions",
      SUM(CASE WHEN status = 'correct' OR status = 'incorrect' THEN 1 ELSE 0 END) as "doneQuestions"
    FROM "user_questions"
    WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)
  `, [String(userId)]);

  return {
    usedQuestions: Number(usage?.usedQuestions || 0),
    doneQuestions: Number(usage?.doneQuestions || 0)
  };
}

export async function getUserProductStats(userId, packageId) {
  if (!userId || !packageId) {
    console.warn("getUserProductStats called without userId or packageId");
    return { accuracy: 0, usage: 0, completedTests: 0, totalQuestions: 0, attemptedQuestions: 0 };
  }

  const pidStr = packageId.toString();

  const productUniverse = (await queryOne(`
    SELECT COUNT(*) as count
    FROM "questions"
    WHERE (CAST("productId" AS TEXT) = CAST($1 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($2 AS TEXT))
    AND (status = 'published' OR published = 1)
  `, [pidStr, pidStr])).count;

  const userProgress = await queryOne(`
    SELECT
      SUM(CASE WHEN status = 'correct' THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN status = 'incorrect' THEN 1 ELSE 0 END) as incorrect,
      SUM(CASE WHEN status = 'omitted' THEN 1 ELSE 0 END) as omitted,
      COUNT(DISTINCT "questionId") as "uniqueUsed"
    FROM "user_questions"
    WHERE "userId" = $1 AND (CAST("productId" AS TEXT) = CAST($2 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($3 AS TEXT))
  `, [userId, pidStr, pidStr]);

  const completedTests = (await queryOne(`SELECT COUNT(*) as count FROM "tests" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND (CAST("productId" AS TEXT) = CAST($2 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($3 AS TEXT)) AND "isSuspended" = 0`, [userId, pidStr, pidStr])).count;

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
