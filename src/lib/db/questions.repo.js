import { queryOne, query, execute, transaction } from "../pg";

export async function getUserQuestions(userId, productId) {
  const sql = `
    SELECT
      q.id, q."productId", q."packageId", q.subject, q.system, q.topic, q.status,
      q."cognitiveLevel", q.type, q.published, q."isLatest", q."versionNumber",
      q."createdAt", q."updatedAt",
      uq.status as userStatus,
      uq.isMarked,
      uq.userAnswer,
      uq.totalAttempts
    FROM "questions" q
    LEFT JOIN "user_questions" uq ON CAST(q.id AS TEXT) = CAST(uq."questionId" AS TEXT)
      AND CAST(uq."userId" AS TEXT) = CAST($1 AS TEXT)
      AND (CAST(uq."productId" AS TEXT) = CAST($2 AS TEXT) OR CAST(uq."packageId" AS TEXT) = CAST($3 AS TEXT))
    WHERE (CAST(q."productId" AS TEXT) = CAST($4 AS TEXT) OR CAST(q."packageId" AS TEXT) = CAST($5 AS TEXT))
    AND (q.status = 'published' OR q.published = 1)
  `;

  try {
    const questions = await query(sql, [userId, productId, productId, productId, productId]);

    return questions.map((q) => ({
      ...q,
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

export async function initializeUserQuestions(userId, packageId, questionIds) {
  const uidStr = String(userId);
  const pidStr = String(packageId);
  const now = new Date().toISOString();

  console.log(`[Content Engine] Initializing ${questionIds.length} questions for user ${uidStr} in product ${pidStr}`);

  await transaction(async (client) => {
    for (const qid of questionIds) {
      await client.query(`
        INSERT INTO "user_questions" ("userId", "questionId", "packageId", "productId", status, "totalAttempts", "updatedAt")
        VALUES ($1, $2, $3, $4, NULL, 0, $5)
        ON CONFLICT DO NOTHING
      `, [uidStr, String(qid), pidStr, pidStr, now]);
    }
  });

  return true;
}

export async function updateUserQuestion({ userId, questionId, productId, selectedAnswer = null, newStatus = null, toggleFlag = false, timeSpent = 0 }) {
  const uidStr = String(userId);
  const qidStr = String(questionId);
  const pidStr = String(productId);

  if (!productId) {
    throw new Error("Database Error: productId (packageId) is required for updating user question progress.");
  }

  const now = new Date().toISOString();
  const timeSpentDelta = Number.isFinite(timeSpent) ? timeSpent : Number(timeSpent) || 0;

  console.log(`[Content Engine] Updating progress for user ${uidStr}, question ${qidStr}, product ${pidStr}`);

  const existing = await queryOne(
    `SELECT status, "isMarked" FROM "user_questions" WHERE "userId" = $1 AND "questionId" = $2 AND (CAST("productId" AS TEXT) = CAST($3 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($4 AS TEXT))`,
    [uidStr, qidStr, pidStr, pidStr]
  );

  if (!existing) {
    console.log("[Content Engine] Progress record missing. Creating record.");
    await execute(`
      INSERT INTO "user_questions" (
        "userId", "questionId", "productId", "packageId", status, "isMarked", "userAnswer",
        "totalAttempts", "timeSpent", "lastAnswer", "lastSeenAt", "updatedAt", "lastUpdated"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [uidStr, qidStr, pidStr, pidStr, newStatus, toggleFlag ? 1 : 0, selectedAnswer, newStatus ? 1 : 0, timeSpentDelta, selectedAnswer, now, now, now]);
    return true;
  }

  const finalMarked = toggleFlag ? (existing.isMarked ? 0 : 1) : existing.isMarked;

  let finalStatus = newStatus;
  if (newStatus === "omitted" && existing.status && existing.status !== "unused") {
    finalStatus = existing.status;
  }

  await execute(`
    UPDATE "user_questions" SET
      status = COALESCE($1, status),
      "isMarked" = $2,
      "userAnswer" = COALESCE($3, "userAnswer"),
      "lastAnswer" = $4,
      "totalAttempts" = "totalAttempts" + $5,
      "timeSpent" = "timeSpent" + $6,
      "lastSeenAt" = $7,
      "updatedAt" = $8,
      "lastUpdated" = $9
    WHERE "userId" = $10 AND "questionId" = $11 AND (CAST("productId" AS TEXT) = CAST($12 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($13 AS TEXT))
  `, [finalStatus, finalMarked, selectedAnswer, selectedAnswer, newStatus ? 1 : 0, timeSpentDelta, now, now, now, uidStr, qidStr, pidStr, pidStr]);

  return true;
}

export async function getEligiblePool(userId, packageId, filters = {}, limit = null) {
  const uidStr = String(userId);
  const pidStr = String(packageId);

  console.log(`[Content Engine] Calculating eligible pool for user ${uidStr} in product ${pidStr}`);

  let sql = `
    WITH latest AS (
      SELECT "questionId", "selectedOption", "isCorrect", "isFlagged"
      FROM (
        SELECT
          a."questionId" as "questionId",
          a."selectedOption" as "selectedOption",
          a."isCorrect" as "isCorrect",
          a."isFlagged" as "isFlagged",
          ta."finishedAt" as "finishedAt",
          ROW_NUMBER() OVER (PARTITION BY a."questionId" ORDER BY ta."finishedAt" DESC) as rn
        FROM "test_attempts" ta
        JOIN "test_answers" a ON CAST(a."testAttemptId" AS TEXT) = CAST(ta.id AS TEXT)
        WHERE CAST(ta."userId" AS TEXT) = CAST($1 AS TEXT) AND CAST(ta."productId" AS TEXT) = CAST($2 AS TEXT) AND ta."finishedAt" IS NOT NULL
      )
      WHERE rn = 1
    )
    SELECT q.id
    FROM "questions" q
    LEFT JOIN latest l ON CAST(l."questionId" AS TEXT) = CAST(q.id AS TEXT)
    WHERE (CAST(q."packageId" AS TEXT) = CAST($3 AS TEXT) OR CAST(q."productId" AS TEXT) = CAST($4 AS TEXT))
      AND (q.status = 'published' OR q.published = 1)
  `;

  const params = [uidStr, pidStr, pidStr, pidStr];
  let paramIndex = 5;

  if (filters.systems && filters.systems.length > 0) {
    sql += ` AND q.system IN (${filters.systems.map((_, i) => `$${paramIndex++}`).join(",")})`;
    params.push(...filters.systems);
  }

  if (filters.subjects && filters.subjects.length > 0) {
    sql += ` AND q.subject IN (${filters.subjects.map((_, i) => `$${paramIndex++}`).join(",")})`;
    params.push(...filters.subjects);
  }

  if (filters.usageState === "unused") {
    sql += " AND l.\"questionId\" IS NULL";
  } else if (filters.usageState === "incorrect") {
    sql += " AND l.\"selectedOption\" IS NOT NULL AND l.\"selectedOption\" != '' AND l.\"isCorrect\" = 0";
  } else if (filters.usageState === "correct") {
    sql += " AND l.\"selectedOption\" IS NOT NULL AND l.\"selectedOption\" != '' AND l.\"isCorrect\" = 1";
  } else if (filters.usageState === "omitted") {
    sql += " AND l.\"questionId\" IS NOT NULL AND (l.\"selectedOption\" IS NULL OR l.\"selectedOption\" = '')";
  } else if (filters.usageState === "marked") {
    sql += " AND l.\"isFlagged\" = 1";
  }

  if (limit) {
    sql += " ORDER BY RANDOM() LIMIT $1";
    params.push(limit);
  }

  const results = await query(sql, params);
  console.log(`[Content Engine] Pool size calculated: ${results.length} questions`);
  return results.map((r) => String(r.id));
}

export async function getUniverseSize(packageId) {
  const pidStr = String(packageId);
  const res = await queryOne(`
    SELECT COUNT(*) as count
    FROM "questions"
    WHERE (CAST("packageId" AS TEXT) = CAST($1 AS TEXT) OR CAST("productId" AS TEXT) = CAST($2 AS TEXT))
    AND (status = 'published' OR published = 1)
    `, [pidStr, pidStr]);
  return res ? res.count : 0;
}

export async function resetUserQuestions(userId) {
  const now = new Date().toISOString();

  await transaction(async (client) => {
    await client.query(`
      INSERT INTO "user_questions_archive"
      ("userId", "questionId", status, "isMarked", "userAnswer", "userHistory", "archivedAt")
      SELECT "userId", "questionId", status, "isMarked", "userAnswer", "userHistory", $1
      FROM "user_questions" WHERE CAST("userId" AS TEXT) = CAST($2 AS TEXT)
    `, [now, userId]);

    await client.query(`DELETE FROM "user_questions" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [userId]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await client.query(`DELETE FROM "user_questions_archive" WHERE "archivedAt" < $1`, [thirtyDaysAgo]);
  });

  return true;
}

export async function getAllQuestions(productId = null, includeUnpublished = false) {
  let sql = `
    SELECT q.id, q."productId", q."packageId", q.subject, q.system, q.topic, q.status,
           q."cognitiveLevel", q.type, q.published, q."isLatest", q."versionNumber",
           q."createdAt", q."updatedAt", p.name as "productName"
    FROM "questions" q
    LEFT JOIN "products" p ON CAST(q."productId" AS TEXT) = CAST(p.id AS TEXT)
  `;
  const params = [];

  if (productId) {
    sql += " WHERE (CAST(q.\"productId\" AS TEXT) = CAST($1 AS TEXT) OR CAST(q.\"packageId\" AS TEXT) = CAST($2 AS TEXT))";
    params.push(productId, productId);
  }

  if (!includeUnpublished) {
    sql += productId ? " AND q.status = 'published' AND q.\"isLatest\" = 1" : " WHERE q.status = 'published' AND q.\"isLatest\" = 1";
  }

  sql += " ORDER BY q.\"createdAt\" DESC";

  const questions = await query(sql, params);
  return questions.map((q) => ({
    ...q,
    published: !!q.published,
    isLatest: !!q.isLatest,
  }));
}

export async function getQuestionById(id) {
  const q = await queryOne(`SELECT * FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
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

export async function createQuestion(question) {
  const cleanPid = question.productId ? String(question.productId).replace(/\.0$/, '') : null;
  const cleanPkid = question.packageId ? String(question.packageId).replace(/\.0$/, '') : null;

  await execute(`
    INSERT INTO "questions" (
      id, stem, "stemImage", choices, correct, explanation, "explanationCorrect", "explanationCorrectImage",
      "explanationWrong", "explanationWrongImage", summary, "summaryImage", subject, system, topic,
      "cognitiveLevel", type, published, "createdAt", "updatedAt", "packageId", "productId",
      "conceptId", status, "versionNumber", "isLatest", "globalAttempts", "globalCorrect",
      "choiceDistribution", "totalTimeSpent", "totalVolatility", "totalStrikes", "totalMarks", tags, "references", gallery, "matrixColumns", "matrixPlacement", "hideOptionText"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
  `, [
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
  ]);

  return question;
}

export async function updateQuestion(id, updates) {
  const fields = [];
  const params = [];

  Object.keys(updates).forEach((key) => {
    if (key === "id") return;
    if (["choices", "stemImage", "explanationCorrectImage", "explanationWrongImage", "summaryImage", "tags", "choiceDistribution", "gallery", "matrixColumns"].includes(key)) {
      fields.push(`"${key}" = $${fields.length + 1}`);
      params.push(JSON.stringify(updates[key] || {}));
    } else if (["published", "isLatest", "hideOptionText"].includes(key)) {
      fields.push(`"${key}" = $${fields.length + 1}`);
      params.push(updates[key] ? 1 : 0);
    } else if (["productId", "packageId"].includes(key)) {
      fields.push(`"${key}" = $${fields.length + 1}`);
      params.push(updates[key] ? String(updates[key]).replace(/\.0$/, '') : null);
    } else {
      fields.push(`"${key}" = $${fields.length + 1}`);
      params.push(updates[key]);
    }
  });

  fields.push(`"updatedAt" = $${fields.length + 1}`);
  params.push(new Date().toISOString());
  params.push(id);

  await execute(`UPDATE "questions" SET ${fields.join(", ")} WHERE CAST("id" AS TEXT) = CAST($${fields.length} AS TEXT)`, params);
  return getQuestionById(id);
}

export async function deleteQuestion(id) {
  await execute(`DELETE FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [id]);
  return true;
}

export async function updateQuestionStats(questionId, stats) {
  await execute(`
    UPDATE "questions" SET
      "globalAttempts" = COALESCE("globalAttempts", 0) + $1,
      "globalCorrect" = COALESCE("globalCorrect", 0) + $2,
      "totalTimeSpent" = COALESCE("totalTimeSpent", 0) + $3,
      "totalVolatility" = COALESCE("totalVolatility", 0) + $4,
      "totalStrikes" = COALESCE("totalStrikes", 0) + $5,
      "totalMarks" = COALESCE("totalMarks", 0) + $6,
      "choiceDistribution" = $7,
      "updatedAt" = $8
    WHERE CAST(id AS TEXT) = CAST($9 AS TEXT)
  `, [
    stats.globalAttempts || 0,
    stats.globalCorrect || 0,
    stats.totalTimeSpent || 0,
    stats.totalVolatility || 0,
    stats.totalStrikes || 0,
    stats.totalMarks || 0,
    JSON.stringify(stats.choiceDistribution || {}),
    new Date().toISOString(),
    questionId
  ]);

  return true;
}

export async function logGovernanceHistory(entry) {
  await execute(`
    INSERT INTO "governance_history" ("versionId", "conceptId", "fromState", "toState", "performedBy", "performedAt", notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [entry.versionId, entry.conceptId, entry.fromState, entry.toState, entry.performedBy, entry.performedAt || new Date().toISOString(), entry.notes || null]);
  return true;
}

export async function logGovernanceAction(entry) {
  let conceptId = entry.conceptId;

  if (!conceptId && entry.questionId) {
    const q = await queryOne(`SELECT "conceptId" FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [entry.questionId]);
    if (q) conceptId = q.conceptId;
  }

  await logGovernanceHistory({
    versionId: entry.questionId,
    conceptId,
    fromState: entry.fromState,
    toState: entry.toState,
    performedBy: entry.actorId,
    notes: entry.reason,
  });
  return true;
}

export async function submitQuestionForReview(questionId, userId) {
  await logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "draft",
    toState: "review",
    actorId: userId,
    reason: "Submitted for review",
  });
  return updateQuestion(questionId, { status: "review" });
}

export async function approveQuestion(questionId, userId) {
  await logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "review",
    toState: "published",
    actorId: userId,
    reason: "Approved",
  });
  return updateQuestion(questionId, { status: "published", published: 1, isLatest: 1 });
}

export async function publishQuestion(questionId, userId) {
  return approveQuestion(questionId, userId);
}

export async function deprecateQuestion(questionId, userId) {
  await logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "published",
    toState: "deprecated",
    actorId: userId,
    reason: "Deprecated",
  });
  return updateQuestion(questionId, { status: "deprecated", published: 0 });
}

export async function reviseQuestion(questionId, updates, userId) {
  await logGovernanceAction({
    questionId,
    conceptId: null,
    fromState: "published",
    toState: "draft",
    actorId: userId,
    reason: "Revised",
  });
  return updateQuestion(questionId, { ...updates, status: "draft", published: 0 });
}

export async function getGovernanceHistory(versionId, conceptId) {
  let sql = `SELECT * FROM "governance_history"`;
  const params = [];

  if (versionId) {
    sql += ` WHERE CAST("versionId" AS TEXT) = CAST($1 AS TEXT)`;
    params.push(versionId);
  } else if (conceptId) {
    sql += ` WHERE CAST("conceptId" AS TEXT) = CAST($1 AS TEXT)`;
    params.push(conceptId);
  } else {
    return [];
  }

  sql += ` ORDER BY "performedAt" DESC`;
  return await query(sql, params);
}
