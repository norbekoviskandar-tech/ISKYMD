import pg from 'pg';

// Type parsers for Postgres to JavaScript conversion
pg.types.setTypeParser(20, (v) => Number(v));   // BIGINT to number
pg.types.setTypeParser(1700, (v) => Number(v)); // NUMERIC to number

// Cached pool to avoid creating multiple pools during hot reload
let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params = []) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

export async function execute(text, params = []) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result;
}

export async function transaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
