import crypto from "crypto";
import { queryOne, query, execute, transaction } from "../pg";

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    let parsed = JSON.parse(value);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export async function saveTest(test) {
  const uidStr = String(test.userId);
  const tidStr = String(test.testId);
  const pidStr = String(test.productId || test.packageId);

  if (!pidStr || pidStr === "null") {
    throw new Error("Database Error: productId (packageId) is required for saving or updating a test.");
  }

  console.log(`[Exam Runtime] Saving test ${tidStr} for user ${uidStr} in product ${pidStr}`);

  const existing = await queryOne(`SELECT * FROM "tests" WHERE CAST("testId" AS TEXT) = CAST($1 AS TEXT) AND CAST("userId" AS TEXT) = CAST($2 AS TEXT)`, [tidStr, uidStr]);

  if (existing) {
    await execute(`
      UPDATE "tests" SET
        questions = $1, answers = $2, "firstAnswers" = $3, "markedIds" = $4,
        "currentIndex" = $5, "elapsedTime" = $6, "isSuspended" = $7, date = $8,
        "packageId" = $9, "packageName" = $10, "productId" = $11,
        "universeSize" = $12, "eligiblePoolSize" = $13, "poolLogic" = $14,
        "sessionState" = $15
      WHERE CAST("testId" AS TEXT) = CAST($16 AS TEXT) AND CAST("userId" AS TEXT) = CAST($17 AS TEXT)
    `, [
      JSON.stringify(test.questions),
      JSON.stringify(test.answers || {}),
      JSON.stringify(test.firstAnswers || {}),
      JSON.stringify(test.markedIds || []),
      test.currentIndex || 0,
      test.elapsedTime || 0,
      test.isSuspended ? 1 : 0,
      test.date || new Date().toISOString(),
      pidStr,
      test.packageName || null,
      pidStr,
      test.universeSize || existing.universeSize,
      test.eligiblePoolSize || existing.eligiblePoolSize,
      JSON.stringify(test.poolLogic || {}),
      JSON.stringify(test.sessionState || {}),
      tidStr,
      uidStr
    ]);
  } else {
    await execute(`
      INSERT INTO "tests" (
        "testId", "testNumber", "userId", mode, pool, questions, answers, "firstAnswers",
        "markedIds", "currentIndex", "elapsedTime", "isSuspended", "createdAt", date,
        "packageId", "packageName", "productId", "universeSize", "eligiblePoolSize", "poolLogic", "sessionState"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      tidStr,
      test.testNumber || 1,
      uidStr,
      test.mode || "tutor",
      JSON.stringify(test.pool || []),
      JSON.stringify(test.questions),
      JSON.stringify(test.answers || {}),
      JSON.stringify(test.firstAnswers || {}),
      JSON.stringify(test.markedIds || []),
      test.currentIndex || 0,
      test.elapsedTime || 0,
      test.isSuspended ? 1 : 0,
      new Date().toISOString(),
      test.date || new Date().toISOString(),
      pidStr,
      test.packageName || null,
      pidStr,
      test.universeSize || 0,
      test.eligiblePoolSize || 0,
      JSON.stringify(test.poolLogic || {}),
      JSON.stringify(test.sessionState || {})
    ]);
  }

  const isSuspendedFlag = test.isSuspended === true || test.isSuspended === 1 || test.isSuspended === "1";
  if (!isSuspendedFlag && !test.testAttemptId) {
    const existingUnfinished = await queryOne(
      `SELECT id FROM "test_attempts" WHERE CAST("testId" AS TEXT) = CAST($1 AS TEXT) AND "finishedAt" IS NULL ORDER BY "startedAt" DESC LIMIT 1`,
      [tidStr]
    );

    if (existingUnfinished?.id) {
      test.testAttemptId = existingUnfinished.id;
    } else {
      const attemptId = crypto.randomUUID();
      console.log(`[Exam Runtime] Creating Attempt ${attemptId} for test ${tidStr}`);

      await execute(`
        INSERT INTO "test_attempts" (id, "productId", "userId", "testId", "startedAt", "finishedAt")
        VALUES ($1, $2, $3, $4, $5, NULL)
      `, [attemptId, pidStr, uidStr, tidStr, test.date || new Date().toISOString()]);

      const questionsArray = Array.isArray(test.questions) ? test.questions : [];
      const answersMap = test.answers || {};
      const markedIds = new Set(test.markedIds || []);

      for (const qItem of questionsArray) {
        const qId = typeof qItem === "object" ? qItem.id : qItem;
        let correctOption = typeof qItem === "object" ? qItem.correct : null;

        if (!correctOption) {
          const row = await queryOne(`SELECT correct FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [String(qId)]);
          correctOption = row?.correct || null;
        }

        const selected = answersMap[qId] === undefined || answersMap[qId] === "" ? null : answersMap[qId];
        const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;

        await execute(`
          INSERT INTO "test_answers" ("testAttemptId", "questionId", "selectedOption", "isCorrect", "isFlagged", "correctOption", "timeSpentSec")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [attemptId, qId, selected, isCorrectVal, markedIds.has(qId) ? 1 : 0, correctOption, 0]);
      }

      try {
        const qIds = questionsArray.map((qItem) => String(typeof qItem === "object" ? qItem.id : qItem)).filter(Boolean);
        const qSnap = [];
        
        for (const qid of qIds) {
          const fromPayload = questionsArray.find((x) => typeof x === "object" && x && String(x.id) === qid);
          if (fromPayload && typeof fromPayload === "object") {
            qSnap.push(fromPayload);
          } else {
            const row = await queryOne(`SELECT id, stem, choices, correct, subject, system, topic, "cognitiveLevel", type, published, "isLatest", "versionNumber", "createdAt", "updatedAt" FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [String(qid)]);
            if (row) {
              qSnap.push({
                ...row,
                id: String(row.id),
                choices: parseJson(row.choices, []),
                tags: [],
                stemImage: {},
                explanationCorrectImage: {},
                explanationWrongImage: {},
                summaryImage: {},
              });
            } else {
              qSnap.push({ id: qid });
            }
          }
        }

        await execute(`
          UPDATE "test_attempts" SET
            "questionIds" = $1,
            "questionSnapshots" = $2
          WHERE CAST(id AS TEXT) = CAST($3 AS TEXT)
        `, [JSON.stringify(qIds), JSON.stringify(qSnap), attemptId]);
      } catch (e) {
        console.error("[Exam Runtime] Failed to store baseline attempt snapshot:", e);
      }

      test.testAttemptId = attemptId;
    }
  }

  // Pre-populate user_questions for "usage" tracking and consistent "Unused" logic
  try {
    const questionsArray = Array.isArray(test.questions) ? test.questions : [];

    for (const qItem of questionsArray) {
      const qId = String(typeof qItem === 'object' ? (qItem?.id || "") : qItem);
      if (qId && qId !== 'undefined' && qId !== "") {
        await execute(`
          INSERT INTO "user_questions" 
          ("userId", "questionId", "productId", "packageId", status, "totalAttempts", "lastSeenAt", "updatedAt", "lastUpdated")
          VALUES ($1, $2, $3, $4, 'omitted', 0, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          uidStr,
          qId,
          pidStr,
          pidStr,
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString()
        ]);
      }
    }
  } catch (err) {
    console.error('[Exam Runtime] Failed to pre-populate user_questions:', err);
  }

  return test;
}

export async function updateAttemptAnswer(attemptId, questionId, selectedOption) {
  const selected = selectedOption === undefined || selectedOption === "" ? null : selectedOption;
  const correct = await queryOne(`SELECT "correctOption" FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) = CAST($1 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($2 AS TEXT)`, [attemptId, String(questionId)]);
  const correctOption = correct?.correctOption || null;
  const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;
  return await execute(`
    UPDATE "test_answers"
    SET "selectedOption" = $1, "isCorrect" = $2
    WHERE CAST("testAttemptId" AS TEXT) = CAST($3 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($4 AS TEXT)
  `, [selected, isCorrectVal, attemptId, questionId]);
}

export async function updateAttemptFlag(attemptId, questionId, isFlagged) {
  return await execute(`
    UPDATE "test_answers"
    SET "isFlagged" = $1
    WHERE CAST("testAttemptId" AS TEXT) = CAST($2 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($3 AS TEXT)
  `, [isFlagged ? 1 : 0, attemptId, questionId]);
}

export function updateAttemptReviewMetadata() {
  return true;
}

export async function snapshotAttempt(attemptId, snapshot) {
  const attempt = await queryOne(`SELECT id, "finishedAt" FROM "test_attempts" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.finishedAt) throw new Error("Attempt already finished");

  const questionIds = Array.isArray(snapshot?.questionIds) ? snapshot.questionIds.map(String) : [];
  const markedIds = Array.isArray(snapshot?.markedIds) ? snapshot.markedIds.map(String) : [];
  const timeSpent = snapshot?.timeSpent && typeof snapshot.timeSpent === "object" ? snapshot.timeSpent : {};
  const elapsedTime = Number.isFinite(snapshot?.elapsedTime) ? snapshot.elapsedTime : Number(snapshot?.elapsedTime) || 0;
  const answersMap = snapshot?.answers && typeof snapshot.answers === "object" ? snapshot.answers : {};
  const questionSnapshots = Array.isArray(snapshot?.questionSnapshots) ? snapshot.questionSnapshots : null;

  await transaction(async (client) => {
    await client.query(`
      UPDATE "test_attempts" SET
        "questionIds" = $1,
        "markedIds" = $2,
        "timeSpent" = $3,
        "elapsedTime" = $4,
        "questionSnapshots" = $5
      WHERE CAST(id AS TEXT) = CAST($6 AS TEXT)
    `, [
      JSON.stringify(questionIds),
      JSON.stringify(markedIds),
      JSON.stringify(timeSpent),
      elapsedTime,
      questionSnapshots ? JSON.stringify(questionSnapshots) : null,
      attemptId
    ]);

    const markedSet = new Set(markedIds);
    for (const qId of questionIds) {
      const selected = answersMap[qId] === undefined || answersMap[qId] === "" ? null : answersMap[qId];
      const flagged = markedSet.has(qId) ? 1 : 0;
      const ts = Number(timeSpent[qId] || 0);

      const correctRow = await client.query(`SELECT "correctOption" FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) = CAST($1 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($2 AS TEXT)`, [attemptId, qId]);
      const correctOption = correctRow.rows[0]?.correctOption || null;
      const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;

      await client.query(`
        UPDATE "test_answers" SET
          "selectedOption" = $1,
          "isCorrect" = $2,
          "isFlagged" = $3,
          "timeSpentSec" = $4
        WHERE CAST("testAttemptId" AS TEXT) = CAST($5 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($6 AS TEXT)
      `, [selected, isCorrectVal, flagged, ts, attemptId, qId]);
    }
  });

  return { success: true };
}

export async function finishAttempt(attemptId) {
  const existing = await queryOne(`SELECT id, "finishedAt" FROM "test_attempts" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);
  if (!existing) throw new Error("Attempt not found");
  if (existing.finishedAt) return { success: true, alreadyFinished: true };

  await execute(`
    UPDATE "test_attempts"
    SET "finishedAt" = $1
    WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)
  `, [new Date().toISOString(), attemptId]);

  const attempt = await queryOne(`
    SELECT ta.*, t."userId", t."packageId", t."productId"
    FROM "test_attempts" ta
    JOIN "tests" t ON CAST(ta."testId" AS TEXT) = CAST(t."testId" AS TEXT)
    WHERE CAST(ta.id AS TEXT) = CAST($1 AS TEXT)
  `, [attemptId]);

  if (attempt) {
    const answers = await query(`SELECT * FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);

    for (const answer of answers) {
      const userId = attempt.userId;
      const productId = attempt.productId || attempt.packageId;

      const currentStatus = (await queryOne(
        `SELECT status FROM "user_questions" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND CAST("questionId" AS TEXT) = CAST($2 AS TEXT) AND (CAST("productId" AS TEXT) = CAST($3 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($4 AS TEXT))`,
        [String(userId), String(answer.questionId), String(productId), String(productId)]
      ))?.status || "unused";

      let newStatus;
      if (answer.selectedOption === null || answer.selectedOption === undefined || answer.selectedOption === "") {
        if (currentStatus === "unused") {
          newStatus = "omitted";
        } else {
          newStatus = currentStatus;
        }
      } else {
        newStatus = answer.isCorrect ? "correct" : "incorrect";
      }

      await execute(`
        INSERT INTO "user_questions"
        ("userId", "questionId", "productId", "packageId", status, "userAnswer", "totalAttempts", "lastSeenAt", "updatedAt", "lastUpdated")
        VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9)
        ON CONFLICT ("userId", "questionId", "productId", "packageId") DO UPDATE SET
          status = EXCLUDED.status,
          "userAnswer" = EXCLUDED."userAnswer",
          "totalAttempts" = "user_questions"."totalAttempts" + 1,
          "lastSeenAt" = EXCLUDED."lastSeenAt",
          "updatedAt" = EXCLUDED."updatedAt",
          "lastUpdated" = EXCLUDED."lastUpdated"
      `, [
        String(userId),
        String(answer.questionId),
        String(productId),
        String(productId),
        newStatus,
        answer.selectedOption,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      ]);
    }
  }

  return { success: true, alreadyFinished: false };
}

export async function getTestAttempt(attemptId, role = 'student') {
  const attempt = await queryOne(`SELECT * FROM "test_attempts" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);
  if (!attempt) return null;

  const test = await queryOne(`SELECT * FROM "tests" WHERE CAST("testId" AS TEXT) = CAST($1 AS TEXT)`, [attempt.testId]);
  const answers = await query(`SELECT * FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);

  const answersMap = {};
  const markedIds = [];
  answers.forEach((a) => {
    answersMap[a.questionId] = a.selectedOption;
    if (a.isFlagged) markedIds.push(a.questionId);
  });

  const pidStr = attempt.productId.toString();
  const universe = await queryOne(`SELECT COUNT(*) as count FROM "questions" WHERE (CAST("productId" AS TEXT) = CAST($1 AS TEXT) OR CAST("packageId" AS TEXT) = CAST($2 AS TEXT)) AND status = "published" AND "isLatest" = 1`, [pidStr, pidStr]);

  const questionIds = parseJson(attempt.questionIds, null);
  const questionSnapshots = parseJson(attempt.questionSnapshots, null);
  let questionsInTest = questionSnapshots || questionIds || parseJson(test?.questions, []);

  // Sanitize question fields for non-authors
  if (role !== 'author' && Array.isArray(questionsInTest)) {
    questionsInTest = questionsInTest.map(q => {
      if (typeof q === 'object' && q !== null) {
        const { correct, explanationCorrect, explanationWrong, summary, references, ...sanitized } = q;
        return sanitized;
      }
      return q;
    });
  }

  const totalQuestions = Array.isArray(questionIds)
    ? questionIds.length
    : Array.isArray(questionsInTest)
      ? questionsInTest.length
      : 0;

  const attemptAnswers = [];
  for (const a of answers) {
    const question = await queryOne(`SELECT subject, system, topic, "globalAttempts", "globalCorrect", correct FROM "questions" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [a.questionId]);

    let percentCorrectOthers = "--";
    if (question && question.globalAttempts > 0) {
      percentCorrectOthers = Math.round((question.globalCorrect / question.globalAttempts) * 100) + "%";
    }

    attemptAnswers.push({
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      isFlagged: a.isFlagged,
      correctOption: role === 'author' ? a.correctOption ?? null : null,
      timeSpentSec: a.timeSpentSec ?? 0,
      subject: question?.subject || null,
      system: question?.system || null,
      topic: question?.topic || null,
      percentCorrectOthers,
    });
  }

  return {
    ...test,
    testAttemptId: attempt.id,
    id: attempt.id,
    testId: attempt.testId,
    answers: answersMap,
    attemptAnswers,
    markedIds,
    questions: questionsInTest,
    questionIds: Array.isArray(questionIds) ? questionIds : null,
    totalQuestions,
    elapsedTime: attempt.elapsedTime || test?.elapsedTime || 0,
    timeSpent: parseJson(attempt.timeSpent, {}),
    finishedAt: attempt.finishedAt,
    startedAt: attempt.startedAt,
    isAttempt: true,
    totalProductQuestions: universe?.count || 0,
  };
}

export async function getTestAttemptStats(attemptId) {
  const attempt = await queryOne(`SELECT "finishedAt" FROM "test_attempts" WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);
  const rows = await query(`SELECT "selectedOption", "isCorrect", "isFlagged" FROM "test_answers" WHERE CAST("testAttemptId" AS TEXT) = CAST($1 AS TEXT)`, [attemptId]);

  let correct = 0;
  let incorrect = 0;
  let omitted = 0;
  let flagged = 0;

  for (const r of rows) {
    if (r.isFlagged) flagged++;

    const hasAnswer = r.selectedOption !== null && r.selectedOption !== undefined && r.selectedOption !== "";

    if (hasAnswer) {
      if (r.isCorrect) correct++;
      else incorrect++;
    } else if (attempt?.finishedAt) {
      omitted++;
    }
  }

  const total = rows.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, incorrect, omitted, flagged, total, percentage };
}

export async function getUserTests(userId, packageId) {
  if (!packageId) {
    console.warn("getUserTests called without packageId");
    return [];
  }

  const pidStr = packageId.toString();

  const tests = await query(`
    SELECT
      t.*,
      la.id as "latestAttemptId",
      COALESCE(s.total, 0) as "attemptTotal",
      COALESCE(s.correct, 0) as "attemptCorrect",
      COALESCE(s.incorrect, 0) as "attemptIncorrect",
      COALESCE(s.omitted, 0) as "attemptOmitted",
      COALESCE(s.flagged, 0) as "attemptFlagged"
    FROM "tests" t
    LEFT JOIN "test_attempts" la ON la.id = (
      SELECT id FROM "test_attempts"
      WHERE CAST("testId" AS TEXT) = CAST(t."testId" AS TEXT) AND "finishedAt" IS NOT NULL
      ORDER BY "finishedAt" DESC
      LIMIT 1
    )
    LEFT JOIN (
      SELECT
        "testAttemptId",
        COUNT(*) as total,
        SUM(CASE WHEN "selectedOption" IS NOT NULL AND "selectedOption" != '' AND "isCorrect" = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN "selectedOption" IS NOT NULL AND "selectedOption" != '' AND "isCorrect" = 0 THEN 1 ELSE 0 END) as incorrect,
        SUM(CASE WHEN ("selectedOption" IS NULL OR "selectedOption" = '') THEN 1 ELSE 0 END) as omitted,
        SUM(CASE WHEN "isFlagged" = 1 THEN 1 ELSE 0 END) as flagged
      FROM "test_answers"
      GROUP BY "testAttemptId"
    ) s ON s."testAttemptId" = la.id
    WHERE CAST(t."userId" AS TEXT) = CAST($1 AS TEXT) AND (CAST(t."productId" AS TEXT) = CAST($2 AS TEXT) OR CAST(t."packageId" AS TEXT) = CAST($3 AS TEXT))
    ORDER BY t."createdAt" DESC
  `, [userId, pidStr, pidStr]);

  const result = [];
  for (const t of tests) {
    try {
      const parsedQuestions = parseJson(t.questions, []);
      const poolLogic = parseJson(t.poolLogic, {});

      if ((!poolLogic.subjects || poolLogic.subjects.length === 0 || !poolLogic.systems || poolLogic.systems.length === 0) && parsedQuestions.length > 0) {
        const firstFewIds = parsedQuestions.slice(0, 50).map(q => String(typeof q === 'object' ? q.id : q));
        if (firstFewIds.length > 0) {
          const placeholders = firstFewIds.map((_, i) => `$${i + 1}`).join(",");
          const metadata = await query(`SELECT subject, system FROM "questions" WHERE CAST(id AS TEXT) IN (${placeholders})`, firstFewIds);

          if (!poolLogic.subjects || poolLogic.subjects.length === 0) {
            poolLogic.subjects = [...new Set(metadata.map(m => m.subject))].filter(Boolean);
          }
          if (!poolLogic.systems || poolLogic.systems.length === 0) {
            poolLogic.systems = [...new Set(metadata.map(m => m.system))].filter(Boolean);
          }
        }
      }

      result.push({
        ...t,
        questions: parsedQuestions,
        answers: parseJson(t.answers, {}),
        firstAnswers: parseJson(t.firstAnswers, {}),
        markedIds: parseJson(t.markedIds, []),
        pool: parseJson(t.pool, []),
        poolLogic: poolLogic,
        sessionState: parseJson(t.sessionState, {}),
        isSuspended: !!t.isSuspended,
        latestAttemptId: t.latestAttemptId || null,
        attemptStats: {
          total: Number(t.attemptTotal || 0),
          correct: Number(t.attemptCorrect || 0),
          incorrect: Number(t.attemptIncorrect || 0),
          omitted: Number(t.attemptOmitted || 0),
          flagged: Number(t.attemptFlagged || 0),
        },
      });
    } catch (e) {
      console.error(`Error parsing test ${t.testId}:`, e);
      result.push({ ...t, questions: [], answers: {}, firstAnswers: {}, markedIds: [], pool: [], isSuspended: !!t.isSuspended });
    }
  }

  return result;
}

export async function getTestById(testId, role = 'student') {
  const tidStr = String(testId);

  console.log(`[Exam Runtime] Fetching details for test ${tidStr}`);

  const t = await queryOne(`SELECT * FROM "tests" WHERE CAST("testId" AS TEXT) = CAST($1 AS TEXT)`, [tidStr]);
  if (t) {
    try {
      t.questions = parseJson(t.questions, []);
      t.answers = parseJson(t.answers, {});
      t.firstAnswers = parseJson(t.firstAnswers, {});
      t.markedIds = parseJson(t.markedIds, []);
      t.pool = parseJson(t.pool, []);
      t.poolLogic = parseJson(t.poolLogic, {});
      t.sessionState = parseJson(t.sessionState, {});
      t.isSuspended = !!t.isSuspended;

      // Sanitize question fields for non-authors
      if (role !== 'author' && Array.isArray(t.questions)) {
        t.questions = t.questions.map(q => {
          if (typeof q === 'object' && q !== null) {
            const { correct, explanationCorrect, explanationWrong, summary, references, ...sanitized } = q;
            return sanitized;
          }
          return q;
        });
      }
    } catch (e) {
      console.error(`[Exam Runtime] Error parsing test ${t.testId}:`, e);
      t.questions = [];
      t.answers = {};
      t.firstAnswers = {};
      t.markedIds = [];
      t.pool = [];
      t.isSuspended = !!t.isSuspended;
    }
  }
  return t;
}

export async function deleteTest(testId) {
  await execute(`DELETE FROM "tests" WHERE CAST("testId" AS TEXT) = CAST($1 AS TEXT)`, [testId]);
  return true;
}

export async function clearUserTests(userId) {
  const now = new Date().toISOString();

  try {
    await transaction(async (client) => {
      await client.query(`
        INSERT INTO "tests_archive"
        ("testId", "testNumber", "userId", mode, pool, questions, answers, "firstAnswers", "markedIds", "currentIndex", "elapsedTime", "isSuspended", "packageId", "packageName", "createdAt", date, "archivedAt")
        SELECT "testId", "testNumber", "userId", mode, pool, questions, answers, "firstAnswers", "markedIds", "currentIndex", "elapsedTime", "isSuspended", "packageId", "packageName", "createdAt", date, $1
        FROM "tests" WHERE CAST("userId" AS TEXT) = CAST($2 AS TEXT)
      `, [now, userId]);

      await client.query(`DELETE FROM "tests" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [userId]);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await client.query(`DELETE FROM "tests_archive" WHERE "archivedAt" < $1`, [thirtyDaysAgo]);
    });

    return true;
  } catch (err) {
    console.error(`DB: Failed to clear tests for user ${userId}:`, err.message);
    throw err;
  }
}

export async function restoreUserTests(userId) {
  try {
    const latest = await queryOne(`SELECT MAX("archivedAt") as "lastArchived" FROM "tests_archive" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT)`, [userId]);

    if (!latest || !latest.lastArchived) return false;

    await transaction(async (client) => {
      await client.query(`
        INSERT INTO "tests"
        ("testId", "testNumber", "userId", mode, pool, questions, answers, "firstAnswers", "markedIds", "currentIndex", "elapsedTime", "isSuspended", "packageId", "packageName", "createdAt", date)
        SELECT "testId", "testNumber", "userId", mode, pool, questions, answers, "firstAnswers", "markedIds", "currentIndex", "elapsedTime", "isSuspended", "packageId", "packageName", "createdAt", date
        FROM "tests_archive" WHERE CAST("userId" AS TEXT) = CAST($1 AS TEXT) AND "archivedAt" = $2
      `, [userId, latest.lastArchived]);
    });

    return true;
  } catch (err) {
    console.error(`DB: Failed to restore tests for user ${userId}:`, err.message);
    return false;
  }
}
