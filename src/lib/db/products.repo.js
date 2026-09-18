import { queryOne, query, execute } from "../pg";

export async function getProductUniverseAnalytics(packageId) {
  const pidStr = packageId.toString();

  const totalQuestions = (await queryOne(`SELECT COUNT(*) as count FROM "questions" WHERE "productId" = $1 OR "packageId" = $2`, [pidStr, pidStr])).count;
  const publishedQuestions = (await queryOne(`SELECT COUNT(*) as count FROM "questions" WHERE ("productId" = $1 OR "packageId" = $2) AND status = 'published' AND "isLatest" = 1`, [pidStr, pidStr])).count;

  const exposure = await queryOne(`
        SELECT
            COUNT(DISTINCT "userId") as "activeStudents",
            SUM("totalAttempts") as "totalProductEngagements",
            AVG("totalAttempts") as "avgExposurePerQuestion"
        FROM "user_questions"
        WHERE ("productId" = $1 OR "packageId" = $2)
    `, [pidStr, pidStr]);

  const forensics = await queryOne(`
        SELECT
            AVG("totalTimeSpent" / CAST(NULLIF("globalAttempts", 0) AS NUMERIC)) as "avgSecondsPerQuestion",
            AVG("totalVolatility" / CAST(NULLIF("globalAttempts", 0) AS NUMERIC)) as "avgVolatility",
            AVG("totalStrikes" / CAST(NULLIF("globalAttempts", 0) AS NUMERIC)) as "avgStrikes",
            SUM("globalCorrect") * 100.0 / SUM("globalAttempts") as "aggregateCorrectRate"
        FROM "questions"
        WHERE ("productId" = $1 OR "packageId" = $2) AND status = 'published' AND "isLatest" = 1
    `, [pidStr, pidStr]);

  const systems = await query(`
        SELECT system, COUNT(*) as count
        FROM "questions"
        WHERE ("productId" = $1 OR "packageId" = $2) AND status = 'published' AND "isLatest" = 1
        GROUP BY system
    `, [pidStr, pidStr]);

  return {
    inventory: {
      total: totalQuestions,
      published: publishedQuestions,
      systems,
    },
    engagement: exposure,
    forensics,
  };
}

export async function getGlobalStats(packageId) {
  const pidStr = packageId ? String(packageId) : null;

  console.log(`[Summary Engine] Generating global stats (Product: ${pidStr || "Full Platform"})`);

  const totalUsers = (await queryOne(`SELECT COUNT(*) as count FROM "users"`)).count;

  let questionsCountQuery = `SELECT COUNT(*) as count FROM "questions"`;
  let testsCountQuery = `SELECT COUNT(*) as count FROM "tests"`;
  let timeQuery = `SELECT SUM("elapsedTime") as total FROM "tests"`;

  if (pidStr) {
    questionsCountQuery += ` WHERE "productId" = $1 OR "packageId" = $2`;
    testsCountQuery += ` WHERE "productId" = $1 OR "packageId" = $2`;
    timeQuery += ` WHERE "productId" = $1 OR "packageId" = $2`;
  }

  const totalQuestions = pidStr ? (await queryOne(questionsCountQuery, [pidStr, pidStr])).count : (await queryOne(questionsCountQuery)).count;
  const totalTests = pidStr ? (await queryOne(testsCountQuery, [pidStr, pidStr])).count : (await queryOne(testsCountQuery)).count;

  const publishedCountQuery = `
    SELECT COUNT(*) as count
    FROM "questions"
    WHERE (status = 'published' OR published = 1)
    ${pidStr ? `AND ("productId" = $1 OR "packageId" = $2)` : ""}
  `;
  const publishedCount = pidStr
    ? (await queryOne(publishedCountQuery, [pidStr, pidStr])).count
    : (await queryOne(publishedCountQuery)).count;
  const draftCount = Math.max(0, totalQuestions - publishedCount);

  const topSystemsQuery = `
    SELECT system as name, COUNT(*) as val
    FROM "questions"
    WHERE system IS NOT NULL AND TRIM(system) <> ''
    ${pidStr ? `AND ("productId" = $1 OR "packageId" = $2)` : ""}
    GROUP BY system
    ORDER BY val DESC
    LIMIT 5
  `;
  const topSystems = pidStr
    ? await query(topSystemsQuery, [pidStr, pidStr])
    : await query(topSystemsQuery);

  const recentQuestionsQuery = `
    SELECT id, published, "updatedAt", "createdAt"
    FROM "questions"
    ${pidStr ? `WHERE ("productId" = $1 OR "packageId" = $2)` : ""}
    ORDER BY COALESCE("updatedAt", "createdAt") DESC
    LIMIT 5
  `;
  const recentQuestions = pidStr
    ? await query(recentQuestionsQuery, [pidStr, pidStr])
    : await query(recentQuestionsQuery);

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dau = (await queryOne(`SELECT COUNT(*) as count FROM "users" WHERE "updatedAt" > $1 OR "createdAt" > $2`, [last24h, last24h])).count;
  const paidUsersCount = (await queryOne(`SELECT COUNT(*) as count FROM "users" WHERE "subscriptionStatus" = 'active' AND purchased = 1`)).count;

  const totalTime = (pidStr ? (await queryOne(timeQuery, [pidStr, pidStr])).total : (await queryOne(timeQuery)).total) || 0;
  const avgSeconds = totalTests > 0 ? totalTime / totalTests : 0;

  const behavioralQuery = `
    SELECT
        AVG("totalTimeSpent" / CAST(NULLIF("globalAttempts", 0) AS NUMERIC)) as avgSeconds,
        AVG("totalVolatility" / CAST(NULLIF("globalAttempts", 0) AS NUMERIC)) as avgVolatility,
        SUM("globalCorrect") * 100.0 / CAST(NULLIF(SUM("globalAttempts"), 0) AS NUMERIC) as avgCorrectRate
    FROM "questions"
    ${pidStr ? `WHERE "productId" = $1 OR "packageId" = $2` : ""}
  `;
  const behavioral = pidStr ? await queryOne(behavioralQuery, [pidStr, pidStr]) : await queryOne(behavioralQuery);

  return {
    totalUsers,
    paidUsers: paidUsersCount,
    dau,
    avgSession: `${Math.floor(avgSeconds / 60)}m ${Math.round(avgSeconds % 60)}s`,
    totalQuestions,
    publishedCount,
    draftCount,
    systemData: topSystems,
    recentQuestions,
    totalTests,
    behavioral: behavioral || { avgSeconds: 0, avgVolatility: 0, avgCorrectRate: 0 },
  };
}

export async function getEngagementData(packageId) {
  if (!packageId) {
    console.warn("getEngagementData called without packageId - failing closed");
    return [];
  }
  const pidStr = packageId ? packageId.toString() : null;
  
  const tests = pidStr ? await query(`SELECT "createdAt" FROM "tests" WHERE "productId" = $1`, [pidStr]) : await query(`SELECT "createdAt" FROM "tests"`);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const last7Months = [];

  for (let i = 6; i >= 0; i--) {
    const m = (currentMonth - i + 12) % 12;
    last7Months.push({ name: months[m], val: 0 });
  }

  tests.forEach((t) => {
    const date = new Date(t.createdAt);
    const mName = months[date.getMonth()];
    const entry = last7Months.find((e) => e.name === mName || e.name === months[date.getUTCMonth()]);
    if (entry) entry.val += 1;
  });

  return last7Months;
}

export async function getAllProducts() {
  try {
    const rows = await query(`SELECT * FROM "products" WHERE "isDeleted" = 0 ORDER BY name ASC`);
    return rows.map(mapProductRow);
  } catch (err) {
    console.error("DB: Failed to get all products:", err.message);
    return [];
  }
}

export async function getPublishedProducts() {
  try {
    const rows = await query(`SELECT * FROM "products" WHERE "isActive" = 1 AND "isDeleted" = 0 ORDER BY name ASC`);
    return rows.map(mapProductRow);
  } catch (err) {
    console.error("DB: Failed to get published products:", err.message);
    return [];
  }
}

export async function getProductById(id) {
  try {
    const p = await queryOne(`SELECT * FROM "products" WHERE id = $1 AND "isDeleted" = 0`, [id]);
    return mapProductRow(p);
  } catch (err) {
    console.error(`DB: Failed to get product ${id}:`, err.message);
    return null;
  }
}

export async function getProductByIdIncludeDeleted(id) {
  try {
    const p = await queryOne(`SELECT * FROM "products" WHERE id = $1`, [id]);
    return mapProductRow(p);
  } catch (err) {
    console.error(`DB: Failed to get product ${id}:`, err.message);
    return null;
  }
}

export async function createProduct(product) {
  const result = await execute(`INSERT INTO "products" (name, slug, "duration_days", price, description, "templateType", systems, subjects, plans, "createdAt", "isActive") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`, [
    product.name,
    product.slug || product.name.toLowerCase().replace(/\s+/g, "-"),
    product.duration_days || 0,
    product.price || 0,
    product.description || "",
    product.templateType || "DEFAULT",
    JSON.stringify(product.systems || []),
    JSON.stringify(product.subjects || []),
    JSON.stringify(product.plans || []),
    new Date().toISOString(),
    1
  ]);
  return getProductById(result.rows[0].id);
}

export async function updateProduct(product) {
  await execute(`
    UPDATE "products" SET
      name = $1, "duration_days" = $2, price = $3, description = $4, "isActive" = $5, "templateType" = $6, systems = $7, subjects = $8, plans = $9, "updatedAt" = $10
    WHERE id = $11
  `, [
    product.name,
    product.duration_days || 0,
    product.price || 0,
    product.description,
    product.isActive ? 1 : 0,
    product.templateType || "DEFAULT",
    JSON.stringify(product.systems || []),
    JSON.stringify(product.subjects || []),
    JSON.stringify(product.plans || []),
    new Date().toISOString(),
    product.id
  ]);
  return getProductById(product.id);
}

export async function deleteProduct(id) {
  try {
    const product = await queryOne(`SELECT * FROM "products" WHERE id = $1`, [id]);
    if (!product) {
      throw new Error("Product not found");
    }

    const result = await execute(`DELETE FROM "products" WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      throw new Error("Failed to delete product from database");
    }

    console.log(`Product ${id} ("${product.name}") PERMANENTLY deleted from database`);
    return true;
  } catch (err) {
    console.error(`DB: Failed to permanently delete product ${id}:`, err.message);
    throw err;
  }
}

function mapProductRow(p) {
  if (!p) return null;

  const safeParse = (str, fallback) => {
    if (!str) return fallback;
    try {
      let parsed = JSON.parse(str);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      return parsed;
    } catch (e) {
      console.warn("DB Mapping: Failed to parse JSON column:", e.message, str);
      return fallback;
    }
  };

  const parsedConfig = safeParse(p.defaultCreateTestConfig, {
    columns: ["system"],
    modes: ["timed", "tutor"],
    blockSize: 40,
    negativeMarking: false,
  });
  const normalizedColumns = Array.isArray(parsedConfig?.columns)
    ? parsedConfig.columns.filter((c) => String(c).toLowerCase() !== "difficulty")
    : ["system"];

  return {
    ...p,
    isActive: !!p.isActive,
    is_published: !!(p.isActive || p.is_published),
    templateType: p.templateType || "DEFAULT",
    systems: safeParse(p.systems, []),
    subjects: safeParse(p.subjects, []),
    plans: safeParse(p.plans, []),
    defaultCreateTestConfig: {
      ...parsedConfig,
      columns: normalizedColumns,
    },
  };
}
