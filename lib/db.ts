import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

declare global {
  // eslint-disable-next-line no-var
  var __kbDb: Database.Database | undefined;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  studio_name TEXT NOT NULL,
  accent_color TEXT NOT NULL DEFAULT '#d9480f',
  logo_key TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  password_hash TEXT,
  allow_download INTEGER NOT NULL DEFAULT 1,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  allow_selection INTEGER NOT NULL DEFAULT 1,
  watermark INTEGER NOT NULL DEFAULT 0,
  approved_at INTEGER,
  approved_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS galleries_user ON galleries(user_id);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  kind TEXT NOT NULL,
  size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  ext TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS files_gallery ON files(gallery_id);
CREATE TABLE IF NOT EXISTS favorites (
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  visitor TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (file_id, visitor)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  visitor TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_gallery ON comments(gallery_id);
`;

export function db(): Database.Database {
  if (!globalThis.__kbDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const d = new Database(path.join(DATA_DIR, 'app.db'));
    d.pragma('journal_mode = WAL');
    d.pragma('foreign_keys = ON');
    d.pragma('busy_timeout = 5000');
    d.exec(SCHEMA);
    globalThis.__kbDb = d;
  }
  return globalThis.__kbDb;
}

export const newId = () => crypto.randomUUID();

const SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
export function newSlug(len = 12): string {
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += SLUG_CHARS[bytes[i] % SLUG_CHARS.length];
  return s;
}

export type User = {
  id: string;
  email: string;
  password_hash: string;
  studio_name: string;
  accent_color: string;
  logo_key: string | null;
  created_at: number;
};

export type Gallery = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string;
  password_hash: string | null;
  allow_download: number;
  allow_comments: number;
  allow_selection: number;
  watermark: number;
  approved_at: number | null;
  approved_by: string | null;
  created_at: number;
};

export type FileRow = {
  id: string;
  gallery_id: string;
  name: string;
  mime: string;
  kind: 'image' | 'video';
  size: number;
  width: number | null;
  height: number | null;
  ext: string;
  created_at: number;
};

export type Favorite = { file_id: string; visitor: string };
export type Comment = {
  id: string;
  file_id: string;
  visitor: string;
  body: string;
  created_at: number;
};
