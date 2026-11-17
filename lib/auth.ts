import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db, DATA_DIR, type User, type Gallery } from './db';

const SESSION_COOKIE = 'kb_session';
const SESSION_DAYS = 30;
const secure = process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1';

let cachedSecret: string | undefined;
function secret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET) return (cachedSecret = process.env.SESSION_SECRET);
  const file = path.join(DATA_DIR, 'secret');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    cachedSecret = fs.readFileSync(file, 'utf8');
  } catch {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, cachedSecret, { mode: 0o600 });
  }
  return cachedSecret;
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function createSession(userId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  db().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    expires: new Date(expires),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db()
    .prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
    )
    .get(sha(token), Date.now()) as User | undefined;
  return row ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

// Zugang zu passwortgeschützten Galerien: signiertes Cookie, das an den
// aktuellen Passwort-Hash gebunden ist (Passwortwechsel sperrt alle aus).
const galleryCookie = (g: Gallery) => `kb_g_${g.id.slice(0, 8)}`;
const galleryToken = (g: Gallery) =>
  crypto.createHmac('sha256', secret()).update(`${g.id}:${g.password_hash}`).digest('hex');

export async function grantGalleryAccess(g: Gallery): Promise<void> {
  (await cookies()).set(galleryCookie(g), galleryToken(g), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 30 * 86400,
  });
}

export async function hasGalleryAccess(g: Gallery): Promise<boolean> {
  if (!g.password_hash) return true;
  const value = (await cookies()).get(galleryCookie(g))?.value;
  if (!value) return false;
  const expected = galleryToken(g);
  return value.length === expected.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

// Einfache Bremse gegen Passwort-Raten (pro Prozess, im Speicher).
const attempts = new Map<string, { count: number; reset: number }>();
export function rateLimited(key: string, max = 10, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > max;
}
