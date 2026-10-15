import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../../schema.sql');

const { Pool } = pg;

const connectionString = process.env.PG_URI || process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'estatedesk',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000
      }
);

pool.on('error', (err) => {
  console.warn('[DB POOL] Notice on idle client:', err.message);
});

const originalPoolQuery = pool.query.bind(pool);
pool.query = async function (text, params) {
  try {
    return await originalPoolQuery(text, params);
  } catch (err) {
    const isNetworkGlitch =
      ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', '57P01', '57P02', '57P03'].includes(err.code) ||
      String(err.message || '').toLowerCase().includes('timeout') ||
      String(err.message || '').toLowerCase().includes('connection');

    if (isNetworkGlitch) {
      console.warn(`[DB] Network glitch (${err.code || err.message}). Retrying query once...`);
      await new Promise(r => setTimeout(r, 600));
      return await originalPoolQuery(text, params);
    }
    throw err;
  }
};

let isPostgresConnected = false;

export async function initDb() {
  try {
    const client = await pool.connect();
    isPostgresConnected = true;

    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);
      await client.query(`
        UPDATE registrations 
        SET mobile = REGEXP_REPLACE(REGEXP_REPLACE(mobile, '^(\\+91|91)', ''), '[\\s\\-\\+]', '', 'g')
        WHERE mobile IS NOT NULL AND mobile ~ '[^0-9]';

        UPDATE registrations
        SET mobile = NULL
        WHERE mobile = '';

        UPDATE registrations
        SET email = NULL
        WHERE email = '';
      `);
      console.log('[DB] Connected to PostgreSQL. Tables verified / auto-created successfully.');
    } else {
      console.log('[DB] Connected to PostgreSQL successfully.');
    }

    client.release();
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection notice: ${err.message}.`);
    console.warn('[DB] Fallback database adapter active.');
    isPostgresConnected = false;
  }
}

export const memoryDb = {
  staff: [
    {
      id: 1,
      name: 'Asha Admin',
      email: 'admin@test.com',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'admin'
    },
    {
      id: 2,
      name: 'Vikram Agent',
      email: 'vikram@test.com',
      password_hash: bcrypt.hashSync('Agent@123', 10),
      role: 'agent'
    },
    {
      id: 3,
      name: 'Meera Agent',
      email: 'meera@test.com',
      password_hash: bcrypt.hashSync('Agent@123', 10),
      role: 'agent'
    }
  ],
  registrations: [],
  otps: []
};

export async function query(text, params = []) {
  if (isPostgresConnected) {
    return pool.query(text, params);
  }
  return null;
}

export function isDbConnected() {
  return isPostgresConnected;
}
