import pg from 'pg';
import { seedConfig, seedLeads } from './seed.js';

const { Pool } = pg;

export async function openDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS configurations (
      version INTEGER PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('published', 'draft', 'archived')),
      config_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      published_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_draft ON configurations(status) WHERE status = 'draft';
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      captured_at TIMESTAMPTZ NOT NULL,
      config_version INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      answers_json JSONB NOT NULL,
      estimate_low INTEGER NOT NULL,
      estimate_high INTEGER NOT NULL
    );
  `);
  const { rowCount } = await pool.query('SELECT 1 FROM configurations LIMIT 1');
  if (!rowCount) await pool.query('INSERT INTO configurations VALUES ($1, $2, $3::jsonb, $4, $5)', [3, 'published', JSON.stringify(seedConfig), new Date(), new Date()]);
  for (const lead of seedLeads) await pool.query(
    'INSERT INTO leads VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) ON CONFLICT (id) DO NOTHING',
    [lead.id, lead.captured_at, lead.config_version, lead.name, lead.phone, lead.email, JSON.stringify(lead.answers), lead.estimate_low, lead.estimate_high]
  );
  return pool;
}

const configFrom = row => row ? structuredClone(row.config_json) : null;

export async function getPublishedConfig(pool, version) {
  const result = version
    ? await pool.query("SELECT config_json FROM configurations WHERE version = $1 AND status IN ('published','archived')", [version])
    : await pool.query("SELECT config_json FROM configurations WHERE status = 'published' ORDER BY version DESC LIMIT 1");
  return configFrom(result.rows[0]);
}

export async function getEditableConfig(pool) {
  const draft = await pool.query("SELECT config_json FROM configurations WHERE status = 'draft'");
  if (draft.rowCount) return { ...configFrom(draft.rows[0]), is_draft: true };
  return { ...(await getPublishedConfig(pool)), is_draft: false };
}

export async function saveDraft(pool, config) {
  const published = await getPublishedConfig(pool);
  const next = structuredClone(config); delete next.is_draft;
  next.config_version = published.config_version + 1;
  const existing = await pool.query("SELECT version FROM configurations WHERE status = 'draft'");
  if (existing.rowCount) await pool.query('UPDATE configurations SET config_json = $1::jsonb, created_at = $2 WHERE version = $3', [JSON.stringify(next), new Date(), existing.rows[0].version]);
  else await pool.query('INSERT INTO configurations VALUES ($1, $2, $3::jsonb, $4, NULL)', [next.config_version, 'draft', JSON.stringify(next), new Date()]);
  return next;
}

export async function publishDraft(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const draft = await client.query("SELECT version, config_json FROM configurations WHERE status = 'draft' FOR UPDATE");
    if (!draft.rowCount) { await client.query('ROLLBACK'); return null; }
    await client.query("UPDATE configurations SET status = 'archived' WHERE status = 'published'");
    await client.query("UPDATE configurations SET status = 'published', published_at = $1 WHERE version = $2", [new Date(), draft.rows[0].version]);
    await client.query('COMMIT');
    return configFrom(draft.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function listLeads(pool) {
  const result = await pool.query('SELECT * FROM leads ORDER BY captured_at DESC');
  return result.rows.map(row => ({ ...row, captured_at: new Date(row.captured_at).toISOString(), answers: structuredClone(row.answers_json), answers_json: undefined }));
}

export async function insertLead(pool, lead) {
  await pool.query('INSERT INTO leads VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)', [lead.id, lead.captured_at, lead.config_version, lead.name.trim(), lead.phone.trim(), lead.email.trim().toLowerCase(), JSON.stringify(lead.answers), lead.estimate_low, lead.estimate_high]);
}
