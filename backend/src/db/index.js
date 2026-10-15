import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;

// PostgreSQL Pool configuration (supports PG_URI / DATABASE_URL for Neon / cloud Postgres)
const connectionString = process.env.PG_URI || process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'estatedesk'
      }
);

let isPostgresConnected = false;

// Test DB connection
export async function initDb() {
  try {
    const client = await pool.connect();
    isPostgresConnected = true;
    client.release();
    console.log('[DB] Connected to PostgreSQL successfully.');
  } catch (err) {
    console.warn(`[DB] PostgreSQL connection notice: ${err.message}.`);
    console.warn('[DB] Fallback database adapter active.');
    isPostgresConnected = false;
  }
}

// In-memory fallback repository for isolated testing
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

// Generic query runner that uses Postgres if connected, or memoryDb if offline
export async function query(text, params = []) {
  if (isPostgresConnected) {
    return pool.query(text, params);
  }
  return null;
}

export function isDbConnected() {
  return isPostgresConnected;
}
