// Persistence: conversations live in memory (short-lived, TTL-evicted);
// drafts, published sites and customer enquiries live in SQLite so they survive restarts.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_SESSIONS = 2000;
const sessions = new Map();

export const newId = (bytes = 12) => crypto.randomBytes(bytes).toString('base64url');

export function getSession(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  const s = sessions.get(id);
  if (!s) return null;
  if (Date.now() - s.touchedAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  s.touchedAt = Date.now();
  return s;
}

export function createSession(lang = 'en-IN') {
  if (sessions.size >= MAX_SESSIONS) evictOldest();
  const s = {
    id: newId(),
    lang,
    messages: [], // Claude conversation history (server-side only; the client can't tamper with it)
    profile: {},
    domains: [],
    draftId: null,
    awaitingApproval: false,
    busy: false,
    createdAt: Date.now(),
    touchedAt: Date.now(),
  };
  sessions.set(s.id, s);
  return s;
}

function evictOldest() {
  let oldest = null;
  for (const s of sessions.values()) if (!oldest || s.touchedAt < oldest.touchedAt) oldest = s;
  if (oldest) sessions.delete(oldest.id);
}

// ---------- SQLite-backed records (node:sqlite — built in, no native deps) ----------
let db = null;
function getDb() {
  if (db) return db;
  const file = config.dataDir === ':memory:' ? ':memory:' : path.join(config.dataDir, 'bolbiz.db');
  if (file !== ':memory:') fs.mkdirSync(config.dataDir, { recursive: true });
  db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sites (
      slug TEXT PRIMARY KEY, owner_session TEXT NOT NULL, data TEXT NOT NULL,
      published_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL REFERENCES sites(slug),
      name TEXT NOT NULL, reply TEXT NOT NULL, message TEXT NOT NULL, translated TEXT,
      emailed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_enquiries_slug ON enquiries(slug, created_at);
  `);
  return db;
}

const now = () => new Date().toISOString();
const parse = (row) => (row ? JSON.parse(row.data) : null);

export const drafts = {
  async save(id, data) {
    getDb()
      .prepare('INSERT INTO drafts (id, session_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .run(id, data.sessionId || '', JSON.stringify(data), now());
  },
  async get(id) {
    return parse(getDb().prepare('SELECT data FROM drafts WHERE id = ?').get(id));
  },
};

export const sites = {
  async save(slug, data) {
    getDb()
      .prepare('INSERT INTO sites (slug, owner_session, data, published_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
      .run(slug, data.ownerSession || '', JSON.stringify(data), data.publishedAt || now(), now());
  },
  async get(slug) {
    return parse(getDb().prepare('SELECT data FROM sites WHERE slug = ?').get(slug));
  },
  async list(limit = 50) {
    return getDb().prepare('SELECT slug FROM sites ORDER BY published_at DESC LIMIT ?').all(limit).map((r) => r.slug);
  },
};

export const enquiries = {
  async add({ slug, name, reply, message, translated }) {
    const r = getDb()
      .prepare('INSERT INTO enquiries (slug, name, reply, message, translated, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(slug, String(name).slice(0, 80), String(reply).slice(0, 120), String(message).slice(0, 1500), translated || null, now());
    return Number(r.lastInsertRowid);
  },
  async markEmailed(id) {
    getDb().prepare('UPDATE enquiries SET emailed = 1 WHERE id = ?').run(id);
  },
  async countFor(slug) {
    return getDb().prepare('SELECT COUNT(*) AS n FROM enquiries WHERE slug = ?').get(slug).n;
  },
};

export function closeDb() {
  db?.close();
  db = null;
}

export const _test = { sessions };
