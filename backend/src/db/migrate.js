import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const schemaPath = path.resolve(__dirname, '../../schema.sql');
  console.log(`[MIGRATE] Reading schema from: ${schemaPath}`);

  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const client = await pool.connect();
    console.log('[MIGRATE] Connected to PostgreSQL. Applying migrations...');
    await client.query(sql);
    client.release();
    console.log('[MIGRATE] Schema and seeds applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[MIGRATE ERROR] Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
