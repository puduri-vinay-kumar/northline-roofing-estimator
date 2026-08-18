import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seedConfig, seedLeads } from './seed.js';

export function openDatabase(path = process.env.DATABASE_PATH || './data/northline.db') {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS configurations (
      version INTEGER PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('published', 'draft', 'archived')),
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_draft ON configurations(status) WHERE status = 'draft';
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      captured_at TEXT NOT NULL,
      config_version INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      estimate_low INTEGER NOT NULL,
      estimate_high INTEGER NOT NULL
    );
  `);
  seed(db);
  return db;
}

function seed(db) {
  if (!db.prepare('SELECT 1 FROM configurations LIMIT 1').get()) {
    db.prepare('INSERT INTO configurations VALUES (?, ?, ?, ?, ?)').run(3, 'published', JSON.stringify(seedConfig), new Date().toISOString(), new Date().toISOString());
  }
  const insertLead = db.prepare('INSERT OR IGNORE INTO leads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const lead of seedLeads) insertLead.run(lead.id, lead.captured_at, lead.config_version, lead.name, lead.phone, lead.email, JSON.stringify(lead.answers), lead.estimate_low, lead.estimate_high);
}

export function getPublishedConfig(db, version) {
  const row = version
    ? db.prepare("SELECT * FROM configurations WHERE version = ? AND status IN ('published','archived')").get(version)
    : db.prepare("SELECT * FROM configurations WHERE status = 'published' ORDER BY version DESC LIMIT 1").get();
  return row ? JSON.parse(row.config_json) : null;
}

export function getEditableConfig(db) {
  const draft = db.prepare("SELECT * FROM configurations WHERE status = 'draft'").get();
  if (draft) return { ...JSON.parse(draft.config_json), is_draft: true };
  return { ...getPublishedConfig(db), is_draft: false };
}

export function saveDraft(db, config) {
  const published = getPublishedConfig(db);
  const next = structuredClone(config);
  delete next.is_draft;
  next.config_version = published.config_version + 1;
  const existing = db.prepare("SELECT version FROM configurations WHERE status = 'draft'").get();
  if (existing) db.prepare('UPDATE configurations SET config_json = ?, created_at = ? WHERE version = ?').run(JSON.stringify(next), new Date().toISOString(), existing.version);
  else db.prepare('INSERT INTO configurations VALUES (?, ?, ?, ?, NULL)').run(next.config_version, 'draft', JSON.stringify(next), new Date().toISOString());
  return next;
}

export function publishDraft(db) {
  const draft = db.prepare("SELECT * FROM configurations WHERE status = 'draft'").get();
  if (!draft) return null;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE configurations SET status = 'archived' WHERE status = 'published'").run();
    db.prepare("UPDATE configurations SET status = 'published', published_at = ? WHERE version = ?").run(new Date().toISOString(), draft.version);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return JSON.parse(draft.config_json);
}

export function listLeads(db) {
  return db.prepare('SELECT * FROM leads ORDER BY captured_at DESC').all().map(row => ({
    id: row.id, captured_at: row.captured_at, config_version: row.config_version,
    name: row.name, phone: row.phone, email: row.email, answers: JSON.parse(row.answers_json),
    estimate_low: row.estimate_low, estimate_high: row.estimate_high
  }));
}

export function insertLead(db, lead) {
  db.prepare('INSERT INTO leads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(lead.id, lead.captured_at, lead.config_version, lead.name.trim(), lead.phone.trim(), lead.email.trim().toLowerCase(), JSON.stringify(lead.answers), lead.estimate_low, lead.estimate_high);
}
