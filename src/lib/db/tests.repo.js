import crypto from "crypto";
import { getDb } from "../server-db";

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

export function saveTest(test) {
  const db = getDb();
  const uidStr = String(test.userId);
  const tidStr = String(test.testId);
  const pidStr = String(test.productId || test.packageId);

  if (!pidStr || pidStr === "null") {
    throw new Error("Database Error: productId (packageId) is required for saving or updating a test.");
  }

  console.log(`[Exam Runtime] Saving test ${tidStr} for user ${uidStr} in product ${pidStr}`);

  const existing = db.prepare("SELECT * FROM tests WHERE testId = ? AND userId = ?").get(tidStr, uidStr);

  if (existing) {
    db.prepare(`
      UPDATE tests SET
        questions = ?, answers = ?, firstAnswers = ?, markedIds = ?,
        currentIndex = ?, elapsedTime = ?, isSuspended = ?, date = ?,
        packageId = ?, packageName = ?, productId = ?,
        universeSize = ?, eligiblePoolSize = ?, poolLogic = ?,
        sessionState = ?
      WHERE testId = ? AND userId = ?
    `).run(
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
    );
  } else {
    db.prepare(`
      INSERT INTO tests (
        testId, testNumber, userId, mode, pool, questions, answers, firstAnswers,
        markedIds, currentIndex, elapsedTime, isSuspended, createdAt, date,
        packageId, packageName, productId, universeSize, eligiblePoolSize, poolLogic, sessionState
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );
  }

  const isSuspendedFlag = test.isSuspended === true || test.isSuspended === 1 || test.isSuspended === "1";
  if (!isSuspendedFlag && !test.testAttemptId) {
    const existingUnfinished = db
      .prepare("SELECT id FROM test_attempts WHERE testId = ? AND finishedAt IS NULL ORDER BY startedAt DESC LIMIT 1")
      .get(tidStr);

    if (existingUnfinished?.id) {
      test.testAttemptId = existingUnfinished.id;
    } else {
      const attemptId = crypto.randomUUID();
      console.log(`[Exam Runtime] Creating Attempt ${attemptId} for test ${tidStr}`);

      db.prepare(`
        INSERT INTO test_attempts (id, productId, userId, testId, startedAt, finishedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(attemptId, pidStr, uidStr, tidStr, test.date || new Date().toISOString(), null);

      const insertAnswer = db.prepare(`
        INSERT INTO test_answers (testAttemptId, questionId, selectedOption, isCorrect, isFlagged, correctOption, timeSpentSec)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const questionsArray = Array.isArray(test.questions) ? test.questions : [];
      const answersMap = test.answers || {};
      const markedIds = new Set(test.markedIds || []);

      questionsArray.forEach((qItem) => {
        const qId = typeof qItem === "object" ? qItem.id : qItem;
        let correctOption = typeof qItem === "object" ? qItem.correct : null;

        if (!correctOption) {
          const row = db.prepare("SELECT correct FROM questions WHERE id = ?").get(String(qId));
          correctOption = row?.correct || null;
        }

        const selected = answersMap[qId] === undefined || answersMap[qId] === "" ? null : answersMap[qId];
        const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;

        insertAnswer.run(attemptId, qId, selected, isCorrectVal, markedIds.has(qId) ? 1 : 0, correctOption, 0);
      });

      try {
        const qIds = questionsArray.map((qItem) => String(typeof qItem === "object" ? qItem.id : qItem)).filter(Boolean);
        const qSnap = qIds
          .map((qid) => {
            const fromPayload = questionsArray.find((x) => typeof x === "object" && x && String(x.id) === qid);
            if (fromPayload && typeof fromPayload === "object") return fromPayload;

            const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(String(qid));
            if (!row) return { id: qid };
            return {
              ...row,
              id: String(row.id),
              choices: parseJson(row.choices, []),
              tags: parseJson(row.tags, []),
              stemImage: parseJson(row.stemImage, {}),
              explanationCorrectImage: parseJson(row.explanationCorrectImage, {}),
              explanationWrongImage: parseJson(row.explanationWrongImage, {}),
              summaryImage: parseJson(row.summaryImage, {}),
            };
          })
          .filter(Boolean);

        db.prepare(`
          UPDATE test_attempts SET
            questionIds = ?,
            questionSnapshots = ?
          WHERE id = ?
        `).run(JSON.stringify(qIds), JSON.stringify(qSnap), attemptId);
      } catch (e) {
        console.error("[Exam Runtime] Failed to store baseline attempt snapshot:", e);
      }

      test.testAttemptId = attemptId;
    }
  }

  // Pre-populate user_questions for "usage" tracking and consistent "Unused" logic
  try {
    const questionsArray = Array.isArray(test.questions) ? test.questions : [];
    const prepUserQ = db.prepare(`
      INSERT OR IGNORE INTO user_questions 
      (userId, questionId, productId, packageId, status, totalAttempts, lastSeenAt, updatedAt, lastUpdated)
      VALUES (?, ?, ?, ?, 'omitted', 0, ?, ?, ?)
    `);

    questionsArray.forEach(qItem => {
      const qId = String(typeof qItem === 'object' ? (qItem?.id || "") : qItem);
      if (qId && qId !== 'undefined' && qId !== "") {
        prepUserQ.run(
          uidStr,
          qId,
          pidStr,
          pidStr,
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    });
  } catch (err) {
    console.error('[Exam Runtime] Failed to pre-populate user_questions:', err);
  }

  return test;
}

export function updateAttemptAnswer(attemptId, questionId, selectedOption) {
  const db = getDb();
  const selected = selectedOption === undefined || selectedOption === "" ? null : selectedOption;
  const correct = db.prepare("SELECT correctOption FROM test_answers WHERE testAttemptId = ? AND questionId = ?").get(attemptId, String(questionId));
  const correctOption = correct?.correctOption || null;
  const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;
  return db.prepare(`
    UPDATE test_answers
    SET selectedOption = ?, isCorrect = ?
    WHERE testAttemptId = ? AND questionId = ?
  `).run(selected, isCorrectVal, attemptId, questionId);
}

export function updateAttemptFlag(attemptId, questionId, isFlagged) {
  const db = getDb();
  return db.prepare(`
    UPDATE test_answers
    SET isFlagged = ?
    WHERE testAttemptId = ? AND questionId = ?
  `).run(isFlagged ? 1 : 0, attemptId, questionId);
}

export function updateAttemptReviewMetadata() {
  return true;
}

export function snapshotAttempt(attemptId, snapshot) {
  const db = getDb();
  const attempt = db.prepare("SELECT id, finishedAt FROM test_attempts WHERE id = ?").get(attemptId);
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.finishedAt) throw new Error("Attempt already finished");

  const questionIds = Array.isArray(snapshot?.questionIds) ? snapshot.questionIds.map(String) : [];
  const markedIds = Array.isArray(snapshot?.markedIds) ? snapshot.markedIds.map(String) : [];
  const timeSpent = snapshot?.timeSpent && typeof snapshot.timeSpent === "object" ? snapshot.timeSpent : {};
  const elapsedTime = Number.isFinite(snapshot?.elapsedTime) ? snapshot.elapsedTime : Number(snapshot?.elapsedTime) || 0;
  const answersMap = snapshot?.answers && typeof snapshot.answers === "object" ? snapshot.answers : {};
  const questionSnapshots = Array.isArray(snapshot?.questionSnapshots) ? snapshot.questionSnapshots : null;

  const updateAttemptStmt = db.prepare(`
    UPDATE test_attempts SET
      questionIds = ?,
      markedIds = ?,
      timeSpent = ?,
      elapsedTime = ?,
      questionSnapshots = ?
    WHERE id = ?
  `);

  const updateAnswerStmt = db.prepare(`
    UPDATE test_answers SET
      selectedOption = ?,
      isCorrect = ?,
      isFlagged = ?,
      timeSpentSec = ?
    WHERE testAttemptId = ? AND questionId = ?
  `);

  const tx = db.transaction(() => {
    updateAttemptStmt.run(
      JSON.stringify(questionIds),
      JSON.stringify(markedIds),
      JSON.stringify(timeSpent),
      elapsedTime,
      questionSnapshots ? JSON.stringify(questionSnapshots) : null,
      attemptId
    );

    const markedSet = new Set(markedIds);
    for (const qId of questionIds) {
      const selected = answersMap[qId] === undefined || answersMap[qId] === "" ? null : answersMap[qId];
      const flagged = markedSet.has(qId) ? 1 : 0;
      const ts = Number(timeSpent[qId] || 0);

      const correctRow = db.prepare("SELECT correctOption FROM test_answers WHERE testAttemptId = ? AND questionId = ?").get(attemptId, qId);
      const correctOption = correctRow?.correctOption || null;
      const isCorrectVal = selected === null || !correctOption ? null : selected === correctOption ? 1 : 0;

      updateAnswerStmt.run(selected, isCorrectVal, flagged, ts, attemptId, qId);
    }
  });

  tx();
  return { success: true };
}

export function finishAttempt(attemptId) {
  const db = getDb();
  const existing = db.prepare("SELECT id, finishedAt FROM test_attempts WHERE id = ?").get(attemptId);
  if (!existing) throw new Error("Attempt not found");
  if (existing.finishedAt) return { success: true, alreadyFinished: true };

  db.prepare(`
    UPDATE test_attempts
    SET finishedAt = ?
    WHERE id = ?
  `).run(new Date().toISOString(), attemptId);

  const attempt = db
    .prepare(`
    SELECT ta.*, t.userId, t.packageId, t.productId
    FROM test_attempts ta
    JOIN tests t ON ta.testId = t.testId
    WHERE ta.id = ?
  `)
    .get(attemptId);

  if (attempt) {
    const answers = db.prepare("SELECT * FROM test_answers WHERE testAttemptId = ?").all(attemptId);

    answers.forEach((answer) => {
      const userId = attempt.userId;
      const productId = attempt.productId || attempt.packageId;

      const currentStatus =
        db
          .prepare("SELECT status FROM user_questions WHERE userId = ? AND questionId = ? AND (productId = ? OR packageId = ?)")
          .get(String(userId), String(answer.questionId), String(productId), String(productId))?.status || "unused";

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

      db.prepare(`
        INSERT OR REPLACE INTO user_questions
        (userId, questionId, productId, packageId, status, userAnswer, totalAttempts, lastSeenAt, updatedAt, lastUpdated)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        String(userId),
        String(answer.questionId),
        String(productId),
        String(productId),
        newStatus,
        answer.selectedOption,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString()
      );
    });
  }

  return { success: true, alreadyFinished: false };
}

export function getTestAttempt(attemptId) {
  const db = getDb();
  const attempt = db.prepare("SELECT * FROM test_attempts WHERE id = ?").get(attemptId);
  if (!attempt) return null;

  const test = db.prepare("SELECT * FROM tests WHERE testId = ?").get(attempt.testId);
  const answers = db.prepare("SELECT * FROM test_answers WHERE testAttemptId = ?").all(attemptId);

  const answersMap = {};
  const markedIds = [];
  answers.forEach((a) => {
    answersMap[a.questionId] = a.selectedOption;
    if (a.isFlagged) markedIds.push(a.questionId);
  });

  const pidStr = attempt.productId.toString();
  const universe = db.prepare('SELECT COUNT(*) as count FROM questions WHERE (productId = ? OR packageId = ?) AND status = "published" AND isLatest = 1').get(pidStr, pidStr);

  const questionIds = parseJson(attempt.questionIds, null);
  const questionSnapshots = parseJson(attempt.questionSnapshots, null);
  const questionsInTest = questionSnapshots || questionIds || parseJson(test?.questions, []);

  const totalQuestions = Array.isArray(questionIds)
    ? questionIds.length
    : Array.isArray(questionsInTest)
      ? questionsInTest.length
      : 0;

  const attemptAnswers = answers.map((a) => {
    const question = db.prepare("SELECT subject, system, topic, globalAttempts, globalCorrect FROM questions WHERE id = ?").get(a.questionId);

    let percentCorrectOthers = "--";
    if (question && question.globalAttempts > 0) {
      percentCorrectOthers = Math.round((question.globalCorrect / question.globalAttempts) * 100) + "%";
    }

    return {
      questionId: a.questionId,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      isFlagged: a.isFlagged,
      correctOption: a.correctOption ?? null,
      timeSpentSec: a.timeSpentSec ?? 0,
      subject: question?.subject || null,
      system: question?.system || null,
      topic: question?.topic || null,
      percentCorrectOthers,
    };
  });

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

export function getTestAttemptStats(attemptId) {
  const db = getDb();
  const attempt = db.prepare("SELECT finishedAt FROM test_attempts WHERE id = ?").get(attemptId);
  const rows = db.prepare("SELECT selectedOption, isCorrect, isFlagged FROM test_answers WHERE testAttemptId = ?").all(attemptId);

  let correct = 0;
  let incorrect = 0;
  let omitted = 0;
  let flagged = 0;

  rows.forEach((r) => {
    if (r.isFlagged) flagged++;

    const hasAnswer = r.selectedOption !== null && r.selectedOption !== undefined && r.selectedOption !== "";

    if (hasAnswer) {
      if (r.isCorrect) correct++;
      else incorrect++;
    } else if (attempt?.finishedAt) {
      omitted++;
    }
  });

  const total = rows.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, incorrect, omitted, flagged, total, percentage };
}

export function getUserTests(userId, packageId) {
  const db = getDb();

  if (!packageId) {
    console.warn("getUserTests called without packageId");
    return [];
  }

  const pidStr = packageId.toString();

  const tests = db.prepare(`
    SELECT
      t.*,
      la.id as latestAttemptId,
      COALESCE(s.total, 0) as attemptTotal,
      COALESCE(s.correct, 0) as attemptCorrect,
      COALESCE(s.incorrect, 0) as attemptIncorrect,
      COALESCE(s.omitted, 0) as attemptOmitted,
      COALESCE(s.flagged, 0) as attemptFlagged
    FROM tests t
    LEFT JOIN test_attempts la ON la.id = (
      SELECT id FROM test_attempts
      WHERE testId = t.testId AND finishedAt IS NOT NULL
      ORDER BY finishedAt DESC
      LIMIT 1
    )
    LEFT JOIN (
      SELECT
        testAttemptId,
        COUNT(*) as total,
        SUM(CASE WHEN selectedOption IS NOT NULL AND selectedOption != '' AND isCorrect = 1 THEN 1 ELSE 0 END) as correct,
        SUM(CASE WHEN selectedOption IS NOT NULL AND selectedOption != '' AND isCorrect = 0 THEN 1 ELSE 0 END) as incorrect,
        SUM(CASE WHEN (selectedOption IS NULL OR selectedOption = '') THEN 1 ELSE 0 END) as omitted,
        SUM(CASE WHEN isFlagged = 1 THEN 1 ELSE 0 END) as flagged
      FROM test_answers
      GROUP BY testAttemptId
    ) s ON s.testAttemptId = la.id
    WHERE t.userId = ? AND (t.productId = ? OR t.packageId = ?)
    ORDER BY t.createdAt DESC
  `).all(userId, pidStr, pidStr);

  return tests.map((t) => {
    try {
      const parsedQuestions = parseJson(t.questions, []);
      const poolLogic = parseJson(t.poolLogic, {});

      // If poolLogic is missing subjects/systems, try to derive them from the first few questions
      // to avoid heavy queries while still giving good data for the list view.
      if ((!poolLogic.subjects || poolLogic.subjects.length === 0 || !poolLogic.systems || poolLogic.systems.length === 0) && parsedQuestions.length > 0) {
        const firstFewIds = parsedQuestions.slice(0, 50).map(q => String(typeof q === 'object' ? q.id : q));
        if (firstFewIds.length > 0) {
          const placeholders = firstFewIds.map(() => "?").join(",");
          const metadata = db.prepare(`SELECT subject, system FROM questions WHERE id IN (${placeholders})`).all(firstFewIds);

          if (!poolLogic.subjects || poolLogic.subjects.length === 0) {
            poolLogic.subjects = [...new Set(metadata.map(m => m.subject))].filter(Boolean);
          }
          if (!poolLogic.systems || poolLogic.systems.length === 0) {
            poolLogic.systems = [...new Set(metadata.map(m => m.system))].filter(Boolean);
          }
        }
      }

      return {
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
      };
    } catch (e) {
      console.error(`Error parsing test ${t.testId}:`, e);
      return { ...t, questions: [], answers: {}, firstAnswers: {}, markedIds: [], pool: [], isSuspended: !!t.isSuspended };
    }
  });
}

export function getTestById(testId) {
  const db = getDb();
  const tidStr = String(testId);

  console.log(`[Exam Runtime] Fetching details for test ${tidStr}`);

  const t = db.prepare("SELECT * FROM tests WHERE testId = ?").get(tidStr);
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

export function deleteTest(testId) {
  const db = getDb();
  db.prepare("DELETE FROM tests WHERE testId = ?").run(testId);
  return true;
}

export function clearUserTests(userId) {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO tests_archive
        (testId, testNumber, userId, mode, pool, questions, answers, firstAnswers, markedIds, currentIndex, elapsedTime, isSuspended, packageId, packageName, createdAt, date, archivedAt)
        SELECT testId, testNumber, userId, mode, pool, questions, answers, firstAnswers, markedIds, currentIndex, elapsedTime, isSuspended, packageId, packageName, createdAt, date, ?
        FROM tests WHERE userId = ?
      `).run(now, userId);

      db.prepare("DELETE FROM tests WHERE userId = ?").run(userId);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare("DELETE FROM tests_archive WHERE archivedAt < ?").run(thirtyDaysAgo);
    });

    transaction();
    return true;
  } catch (err) {
    console.error(`DB: Failed to clear tests for user ${userId}:`, err.message);
    throw err;
  }
}

export function restoreUserTests(userId) {
  const db = getDb();
  try {
    const latest = db.prepare("SELECT MAX(archivedAt) as lastArchived FROM tests_archive WHERE userId = ?").get(userId);

    if (!latest || !latest.lastArchived) return false;

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT OR REPLACE INTO tests
        (testId, testNumber, userId, mode, pool, questions, answers, firstAnswers, markedIds, currentIndex, elapsedTime, isSuspended, packageId, packageName, createdAt, date)
        SELECT testId, testNumber, userId, mode, pool, questions, answers, firstAnswers, markedIds, currentIndex, elapsedTime, isSuspended, packageId, packageName, createdAt, date
        FROM tests_archive WHERE userId = ? AND archivedAt = ?
      `).run(userId, latest.lastArchived);
    });

    transaction();
    return true;
  } catch (err) {
    console.error(`DB: Failed to restore tests for user ${userId}:`, err.message);
    return false;
  }
}
