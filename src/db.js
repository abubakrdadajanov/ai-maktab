import 'dotenv/config';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

let client = null;
let mode = 'uninitialized';

export async function initDb() {
  if (client) return client;

  const dbUrl = process.env.DATABASE_URL;

  // Try PostgreSQL server if DATABASE_URL is configured
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    try {
      const pool = new pg.Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 3000,
      });
      // Test the connection
      await pool.query('SELECT 1');
      console.log('PostgreSQL serveriga muvaffaqiyatli ulandi:', dbUrl.replace(/:[^:@]+@/, ':****@'));
      client = pool;
      mode = 'postgresql-server';
      return client;
    } catch (err) {
      console.warn('PostgreSQL serveriga ulanib bo‘lmadi (' + err.message + '). O‘rnatilgan PGlite rejimiga o‘tilmoqda...');
    }
  }

  // Fallback to embedded persistent PGlite
  const dbDir = process.env.PGLITE_DATA_DIR || path.resolve(process.cwd(), 'data', 'aimaktab_pg');
  fs.mkdirSync(dbDir, { recursive: true });
  const pglite = new PGlite(dbDir);
  mode = 'pglite-embedded';
  console.log('PGlite (ichki PostgreSQL) muvaffaqiyatli ishga tushdi:', dbDir);

  client = {
    async query(text, params = []) {
      const res = await pglite.query(text, params);
      const rows = res.rows || [];
      const rowCount = rows.length > 0 ? rows.length : (res.affectedRows !== undefined ? res.affectedRows : 0);
      return {
        rows,
        rowCount,
        fields: res.fields || [],
      };
    },
    async exec(text) {
      return await pglite.exec(text);
    },
    async close() {
      await pglite.close();
    }
  };

  return client;
}

export async function query(text, params = []) {
  if (!client) await initDb();
  if (mode === 'postgresql-server') {
    return await client.query(text, params);
  }
  return await client.query(text, params);
}

export async function exec(sql) {
  if (!client) await initDb();
  if (mode === 'postgresql-server') {
    return await client.query(sql);
  }
  return await client.exec(sql);
}

export async function getDbMode() {
  if (!client) await initDb();
  return mode;
}

export async function transaction(fn) {
  if (!client) await initDb();
  await query('BEGIN');
  try {
    const result = await fn({ query });
    await query('COMMIT');
    return result;
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}
