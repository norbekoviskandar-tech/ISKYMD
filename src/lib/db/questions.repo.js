import { getDb } from "../server-db";

export function getUserQuestions(userId, productId) {
  const db = getDb();

  const query = `
    SELECT
      q.*,
      uq.status as userStatus,
      uq.isMarked,
      uq.userAnswer,
      uq.totalAttempts
    FROM questions q
    LEFT JOIN user_questions uq ON q.id = uq.questionId
      AND uq.userId = ?
      AND (CAST(uq.productId AS TEXT) = CAST(? AS TEXT) OR CAST(uq.packageId AS TEXT) = CAST(? AS TEXT))
    WHERE (CAST(q.productId AS TEXT) = CAST(? AS TEXT) OR CAST(q.packageId AS TEXT) = CAST(? AS TEXT))
    AND (q.status = 'published' OR q.published = 1)
  `;

  try {
    const questions = db.prepare(query).all(userId, productId, productId, productId, productId);

    return questions.map((q) => ({
      ...q,
      choices: JSON.parse(q.choices || "[]"),
      stemImage: JSON.parse(q.stemImage || "{}"),
      explanationCorrectImage: JSON.parse(q.explanationCorrectImage || "{}"),
      explanationWrongImage: JSON.parse(q.explanationWrongImage || "{}"),
      summaryImage: JSON.parse(q.summaryImage || "{}"),
      choiceDistribution: JSON.parse(q.choiceDistribution || "{}"),
      gallery: JSON.parse(q.gallery || "{}"),
      tags: JSON.parse(q.tags || "[]"),
      matrixColumns: JSON.parse(q.matrixColumns || "[]"),
      matrixPlacement: q.matrixPlacement || "after",
      hideOptionText: !!q.hideOptionText,
      published: !!q.published,
      status: q.userStatus || "unused",
      isMarked: !!q.isMarked,
      userAnswer: q.userAnswer || null,
      userHistory: [],
      lifecycleStatus: q.status,
    }));
  } catch (error) {
    console.error("DB Error in getUserQuestions:", error);
    return [];
  }
}

export function initializeUserQuestions(userId, packageId, questionIds) {
  const db = getDb();
  const uidStr = String(userId);
  const pidStr = String(packageId);
  const now = new Date().toISOString();

  console.log(`[Content Engine] Initializing ${questionIds.length} questions for user ${uidStr} in product ${pidStr}`);

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO user_questions (userId, questionId, packageId, productId, status, totalAttempts, updatedAt)
    VALUES (?, ?, ?, ?, NULL, 0, ?)
  `);

  const transaction = db.transaction((ids) => {
    for (const qid of ids) {
      stmt.run(uidStr, String(qid), pidStr, pidStr, now);
    }
  });

  transaction(questionIds);
  return true;
}

export function updateUserQuestion({ userId, questionId, productId, selectedAnswer = null, newStatus = null, toggleFlag = false, timeSpent = 0 }) {
  const db = getDb();
  const uidStr = String(userId);
  const qidStr = String(questionId);
  const pidStr = String(productId);

  if (!productId) {
    throw new Error("Database Error: productId (packageId) is required for updating user question progress.");
  }

  const now = new Date().toISOString();
  const timeSpentDelta = Number.isFinite(timeSpent) ? timeSpent : Number(timeSpent) || 0;

  console.log(`[Content Engine] Updating progress for user ${uidStr}, question ${qidStr}, product ${pidStr}`);

  const existing = db
    .prepare("SELECT status, isMarked FROM user_questions WHERE userId = ? AND questionId = ? AND (productId = ? OR packageId = ?)")
    .get(uidStr, qidStr, pidStr, pidStr);

  if (!existing) {
    console.log("[Content Engine] Progress record missing. Creating record.");
    db.prepare(`
      INSERT INTO user_questions (
        userId, questionId, productId, packageId, status, isMarked, userAnswer,
        totalAttempts, timeSpent, lastAnswer, lastSeenAt, updatedAt, lastUpdated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uidStr, qidStr, pidStr, pidStr, newStatus, toggleFlag ? 1 : 0, selectedAnswer, newStatus ? 1 : 0, timeSpentDelta, selectedAnswer, now, now, now);
    return true;
  }

  const finalMarked = toggleFlag ? (existing.isMarked ? 0 : 1) : existing.isMarked;

  let finalStatus = newStatus;
  if (newStatus === "omitted" && existing.status && existing.status !== "unused") {
    finalStatus = existing.status;
  }

  db.prepare(`
    UPDATE user_questions SET
      status = COALESCE(?, status),
      isMarked = ?,
      userAnswer = COALESCE(?, userAnswer),
      lastAnswer = ?,
      totalAttempts = totalAttempts + ?,
      timeSpent = timeSpent + ?,
      lastSeenAt = ?,
      updatedAt = ?,
      lastUpdated = ?
    WHERE userId = ? AND questionId = ? AND (productId = ? OR packageId = ?)
  `).run(finalStatus, finalMarked, selectedAnswer, selectedAnswer, newStatus ? 1 : 0, timeSpentDelta, now, now, now, uidStr, qidStr, pidStr, pidStr);

  return true;
}

export function getEligiblePool(userId, packageId, filters = {}, limit = null) {
  const db = getDb();
  const uidStr = String(userId);
  const pidStr = String(packageId);

  console.log(`[Content Engine] Calculating eligible pool for user ${uidStr} in product ${pidStr}`);

  let query = `
    WITH latest AS (
      SELECT questionId, selectedOption, isCorrect, isFlagged
      FROM (
        SELECT
          a.questionId as questionId,
          a.selectedOption as selectedOption,
          a.isCorrect as isCorrect,
          a.isFlagged as isFlagged,
          ta.finishedAt as finishedAt,
          ROW_NUMBER() OVER (PARTITION BY a.questionId ORDER BY ta.finishedAt DESC) as rn
        FROM test_attempts ta
        JOIN test_answers a ON a.testAttemptId = ta.id
        WHERE ta.userId = ? AND CAST(ta.productId AS TEXT) = CAST(? AS TEXT) AND ta.finishedAt IS NOT NULL
      )
      WHERE rn = 1
    )
    SELECT q.id
    FROM questions q
    LEFT JOIN latest l ON l.questionId = q.id
    WHERE (CAST(q.packageId AS TEXT) = CAST(? AS TEXT) OR CAST(q.productId AS TEXT) = CAST(? AS TEXT))
      AND (q.status = 'published' OR q.published = 1)
  `;

  const params = [uidStr, pidStr, pidStr, pidStr];

  if (filters.systems && filters.systems.length > 0) {
    query += ` AND q.system IN (${filters.systems.map(() => "?").join(",")})`;
    params.push(...filters.systems);
  }

  if (filters.subjects && filters.subjects.length > 0) {
    query += ` AND q.subject IN (${filters.subjects.map(() => "?").join(",")})`;
    params.push(...filters.subjects);
  }

  if (filters.usageState === "unused") {
    query += " AND l.questionId IS NULL";
  } else if (filters.usageState === "incorrect") {
    query += " AND l.selectedOption IS NOT NULL AND l.selectedOption != '' AND l.isCorrect = 0";
  } else if (filters.usageState === "correct") {
    query += " AND l.selectedOption IS NOT NULL AND l.selectedOption != '' AND l.isCorrect = 1";
  } else if (filters.usageState === "omitted") {
    query += " AND l.questionId IS NOT NULL AND (l.selectedOption IS NULL OR l.selectedOption = '')";
  } else if (filters.usageState === "marked") {
    query += " AND l.isFlagged = 1";
  }

  if (limit) {
    query += " ORDER BY RANDOM() LIMIT ?";
    params.push(limit);
  }

  const results = db.prepare(query).all(...params);
  console.log(`[Content Engine] Pool size calculated: ${results.length} questions`);
  return results.map((r) => String(r.id));
}

export function getUniverseSize(packageId) {
  const db = getDb();
  const pidStr = String(packageId);
  const res = db
    .prepare(`
    SELECT COUNT(*) as count
    FROM questions
    WHERE (CAST(packageId AS TEXT) = CAST(? AS TEXT) OR CAST(productId AS TEXT) = CAST(? AS TEXT))
    AND (status = 'published' OR published = 1)
    `)
    .get(pidStr, pidStr);
  return res ? res.count : 0;
}

export function resetUserQuestions(userId) {
  const db = getDb();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO user_questions_archive
      (userId, questionId, status, isMarked, userAnswer, userHistory, archivedAt)
      SELECT userId, questionId, status, isMarked, userAnswer, userHistory, ?
      FROM user_questions WHERE userId = ?
    `).run(now, userId);

    db.prepare("DELETE FROM user_questions WHERE userId = ?").run(userId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM user_questions_archive WHERE archivedAt < ?").run(thirtyDaysAgo);
  });

  transaction();
  return true;
}

export function getAllQuestions(productId = null, includeUnpublished = false) {
  const db = getDb();
  let query = `
    SELECT q.*, p.name as productName
    FROM questions q
    LEFT JOIN products p ON q.productId = p.id
  `;
  const params = [];

  if (productId) {
    query += " WHERE (CAST(q.productId AS TEXT) = CAST(? AS TEXT) OR CAST(q.packageId AS TEXT) = CAST(? AS TEXT))";
    params.push(productId, productId);
  }

  if (!includeUnpublished) {
    query += productId ? " AND q.status = 'published' AND q.isLatest = 1" : " WHERE q.status = 'published' AND q.isLatest = 1";
  }

  query += " ORDER BY q.createdAt DESC";

  const questions = db.prepare(query).all(...params);
  return questions.map((q) => ({
    ...q,
    choices: JSON.parse(q.choices || "[]"),
    stemImage: JSON.parse(q.stemImage || "{}"),
    explanationCorrectImage: JSON.parse(q.explanationCorrectImage || "{}"),
    explanationWrongImage: JSON.parse(q.explanationWrongImage || "{}"),
    summaryImage: JSON.parse(q.summaryImage || "{}"),
    tags: JSON.parse(q.tags || "[]"),
    choiceDistribution: JSON.parse(q.choiceDistribution || "{}"),
    gallery: JSON.parse(q.gallery || "{}"),
    matrixColumns: JSON.parse(q.matrixColumns || "[]"),
    matrixPlacement: q.matrixPlacement || "after",
    hideOptionText: !!q.hideOptionText,
    published: !!q.published,
    isLatest: !!q.isLatest,
  }));
}

export function getQuestionById(id) {
  const db = getDb();
  const q = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
  if (!q) return null;

  return {
    ...q,
    choices: JSON.parse(q.choices || "[]"),
    stemImage: JSON.parse(q.stemImage || "{}"),
    explanationCorrectImage: JSON.parse(q.explanationCorrectImage || "{}"),
    explanationWrongImage: JSON.parse(q.explanationWrongImage || "{}"),
    summaryImage: JSON.parse(q.summaryImage || "{}"),
    tags: JSON.parse(q.tags || "[]"),
    choiceDistribution: JSON.parse(q.choiceDistribution || "{}"),
    gallery: JSON.parse(q.gallery || "{}"),
    matrixColumns: JSON.parse(q.matrixColumns || "[]"),
    matrixPlacement: q.matrixPlacement || "after",
    hideOptionText: !!q.hideOptionText,
    published: !!q.published,
    isLatest: !!q.isLatest,
  };
}

export function createQuestion(question) {
  const db = getDb();
  const cleanPid = question.productId ? String(question.productId).replace(/\.0$/, '') : null;
  const cleanPkid = question.packageId ? String(question.packageId).replace(/\.0$/, '') : null;

  const stmt = db.prepare(`
      id, stem, stemImage, choices, correct, explanation, explanationCorrect, explanationCorrectImage,
      explanationWrong, explanationWrongImage, summary, summaryImage, subject, system, topic,
      cognitiveLevel, type, published, createdAt, updatedAt, packageId, productId,
      conceptId, status, versionNumber, isLatest, globalAttempts, globalCorrect,
      choiceDistribution, totalTimeSpent, totalVolatility, totalStrikes, totalMarks, tags, "references", gallery, matrixColumns, matrixPlacement, hideOptionText
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    question.id,
    question.stem,
    JSON.stringify(question.stemImage || {}),
    JSON.stringify(question.choices || []),
    question.correct,
    question.explanation || null,
    question.explanationCorrect || null,
    JSON.stringify(question.explanationCorrectImage || {}),
    question.explanationWrong || null,
    JSON.stringify(question.explanationWrongImage || {}),
    question.summary || null,
    JSON.stringify(question.summaryImage || {}),
    question.subject || null,
    question.system || null,
    question.topic || null,
    question.cognitiveLevel || "understanding",
    question.type || "multiple-choice",
    question.published ? 1 : 0,
    question.createdAt || new Date().toISOString(),
    question.updatedAt || new Date().toISOString(),
    cleanPkid,
    cleanPid,
    question.conceptId || null,
    question.status || "draft",
    question.versionNumber || 1,
    question.isLatest !== undefined ? (question.isLatest ? 1 : 0) : 1,
    question.globalAttempts || 0,
    question.globalCorrect || 0,
    JSON.stringify(question.choiceDistribution || {}),
    question.totalTimeSpent || 0,
    question.totalVolatility || 0,
    question.totalStrikes || 0,
    question.totalMarks || 0,
    JSON.stringify(question.tags || []),
    question.references || null,
    JSON.stringify(question.gallery || {}),
    JSON.stringify(question.matrixColumns || []),
    question.matrixPlacement || "after",
    question.hideOptionText ? 1 : 0
  );

  return question;
}

export function updateQuestion(id, updates) {
  const db = getDb();
  const fields = [];
  const params = [];

  Object.keys(updates).forEach((key) => {
    if (key === "id") return;
    if (["choices", "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage", "tags", "choiceDistribution", "gallery", "matrixColumns"].includes(key)) {
      fields.push(`"${key}" = ?`);
      params.push(JSON.stringify(updates[key] || {}));
    } else if (["published", "isLatest", "hideOptionText"].includes(key)) {
      fields.push(`"${key}" = ?`);
      params.push(updates[key] ? 1 : 0);
    } else if (["productId", "packageId"].includes(key)) {
      fields.push(`"${key}" = ?`);
      params.push(updates[key] ? String(updates[key]).replace(/\.0$/, '') : null);
    } else {
      fields.push(`"${key}" = ?`);
      params.push(updates[key]);
    }
  });

  fields.push(`"updatedAt" = ?`);
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE questions SET ${fields.join(", ")} WHERE "id" = ?`).run(...params);
  return getQuestionById(id);
}

export function deleteQuestion(id) {
  const db = getDb();
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  return true;
}

export function updateQuestionStats(questionId, stats) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE questions SET
      globalAttempts = COALESCE(globalAttempts, 0) + ?,
      globalCorrect = COALESCE(globalCorrect, 0) + ?,
      totalTimeSpent = COALESCE(totalTimeSpent, 0) + ?,
      totalVolatility = COALESCE(totalVolatility, 0) + ?,
      totalStrikes = COALESCE(totalStrikes, 0) + ?,
      totalMarks = COALESCE(totalMarks, 0) + ?,
      choiceDistribution = ?,
      updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(
    stats.globalAttempts || 0,
    stats.globalCorrect || 0,
    stats.totalTimeSpent || 0,
    stats.totalVolatility || 0,
    stats.totalStrikes || 0,
    stats.totalMarks || 0,
    JSON.stringify(stats.choiceDistribution || {}),
    new Date().toISOString(),
    questionId
  );

  return true;
}

export function logGovernanceHistory(entry) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO governance_history (versionId, conceptId, fromState, toState, performedBy, performedAt, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(entry.versionId, entry.conceptId, entry.fromState, entry.toState, entry.performedBy, entry.performedAt || new Date().toISOString(), entry.notes || null);
  return true;
}

export function logGovernanceAction(entry) {
  let conceptId = entry.conceptId;

  if (!conceptId && entry.questionId) {
    const db = getDb();
    const q = db.prepare("SELECT conceptId FROM questions WHERE id = ?").get(entry.questionId);
    if (q) conceptId = q.conceptId;
  }

  logGovernanceHistory({
    versionId: entry.questionId,
    conceptId,
    fromState: entry.fromState,
    toState: entry.toState,
    performedBy: entry.actorId,
    notes: entry.reason,
  });
  return true;
}

export function submitQuestionForReview(questionId, userId) {
  logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "draft",
    toState: "review",
    actorId: userId,
    reason: "Submitted for review",
  });
  return updateQuestion(questionId, { status: "review" });
}

export function approveQuestion(questionId, userId) {
  logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "review",
    toState: "published",
    actorId: userId,
    reason: "Approved",
  });
  return updateQuestion(questionId, { status: "published", published: 1, isLatest: 1 });
}

export function publishQuestion(questionId, userId) {
  return approveQuestion(questionId, userId);
}

export function deprecateQuestion(questionId, userId) {
  logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "published",
    toState: "deprecated",
    actorId: userId,
    reason: "Deprecated",
  });
  return updateQuestion(questionId, { status: "deprecated", published: 0 });
}

export function reviseQuestion(questionId, updates, userId) {
  logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "published",
    toState: "draft",
    actorId: userId,
    reason: "Revised",
  });
  return updateQuestion(questionId, { ...updates, status: "draft", published: 0 });
}

export function getGovernanceHistory(versionId, conceptId) {
  const db = getDb();
  let query = "SELECT * FROM governance_history";
  const params = [];

  if (versionId) {
    query += " WHERE versionId = ?";
    params.push(versionId);
  } else if (conceptId) {
    query += " WHERE conceptId = ?";
    params.push(conceptId);
  } else {
    return [];
  }

  query += " ORDER BY performedAt DESC";
  return db.prepare(query).all(...params);
}
