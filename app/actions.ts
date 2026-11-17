'use server';

import path from 'node:path';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import sharp from 'sharp';
import { db, newId, newSlug, type User, type FileRow } from '@/lib/db';
import {
  createSession,
  destroySession,
  grantGalleryAccess,
  hashPassword,
  rateLimited,
  requireUser,
  verifyPassword,
} from '@/lib/auth';
import { galleryById, galleryBySlug } from '@/lib/queries';
import * as storage from '@/lib/storage';

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const fail = (to: string, msg: string): never => redirect(`${to}${to.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);

async function clientKey(prefix: string) {
  const h = await headers();
  return `${prefix}:${h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'}`;
}

export async function register(fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const studio = str(fd, 'studio');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('/register', 'Bitte eine gültige E-Mail-Adresse angeben.');
  if (password.length < 10) fail('/register', 'Das Passwort braucht mindestens 10 Zeichen.');
  if (!studio) fail('/register', 'Bitte den Namen deines Studios oder deiner Agentur angeben.');
  if (db().prepare('SELECT 1 FROM users WHERE email = ?').get(email))
    fail('/register', 'Für diese E-Mail-Adresse gibt es schon ein Konto.');
  const id = newId();
  db()
    .prepare('INSERT INTO users (id, email, password_hash, studio_name, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, hashPassword(password), studio.slice(0, 80), Date.now());
  await createSession(id);
  redirect('/dashboard');
}

export async function login(fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (rateLimited(await clientKey('login'))) fail('/login', 'Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.');
  const user = db().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) fail('/login', 'E-Mail oder Passwort stimmen nicht.');
  await createSession(user!.id);
  redirect('/dashboard');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

export async function createGallery(fd: FormData) {
  const user = await requireUser();
  const title = str(fd, 'title').slice(0, 120);
  if (!title) fail('/dashboard', 'Bitte einen Titel angeben.');
  const id = newId();
  db()
    .prepare('INSERT INTO galleries (id, user_id, slug, title, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, user.id, newSlug(), title, Date.now());
  redirect(`/dashboard/g/${id}`);
}

async function ownGallery(id: string) {
  const user = await requireUser();
  const g = galleryById(id);
  if (!g || g.user_id !== user.id) redirect('/dashboard');
  return g!;
}

export async function updateGallery(fd: FormData) {
  const g = await ownGallery(str(fd, 'id'));
  const title = str(fd, 'title').slice(0, 120) || g.title;
  const description = str(fd, 'description').slice(0, 1000);
  const on = (k: string) => (fd.get(k) ? 1 : 0);
  let passwordHash = g.password_hash;
  const newPassword = String(fd.get('password') ?? '');
  if (fd.get('remove_password')) passwordHash = null;
  else if (newPassword) passwordHash = hashPassword(newPassword);
  db()
    .prepare(
      `UPDATE galleries SET title = ?, description = ?, password_hash = ?, allow_download = ?,
       allow_comments = ?, allow_selection = ?, watermark = ? WHERE id = ?`
    )
    .run(title, description, passwordHash, on('allow_download'), on('allow_comments'), on('allow_selection'), on('watermark'), g.id);
  revalidatePath(`/dashboard/g/${g.id}`);
  redirect(`/dashboard/g/${g.id}?saved=1`);
}

export async function reopenGallery(fd: FormData) {
  const g = await ownGallery(str(fd, 'id'));
  db().prepare('UPDATE galleries SET approved_at = NULL, approved_by = NULL WHERE id = ?').run(g.id);
  revalidatePath(`/dashboard/g/${g.id}`);
}

export async function deleteGallery(fd: FormData) {
  const g = await ownGallery(str(fd, 'id'));
  db().prepare('DELETE FROM galleries WHERE id = ?').run(g.id);
  await storage.removePrefix(`g/${g.id}`);
  redirect('/dashboard');
}

export async function deleteFile(fd: FormData) {
  const file = db().prepare('SELECT * FROM files WHERE id = ?').get(str(fd, 'id')) as FileRow | undefined;
  if (!file) return;
  const g = await ownGallery(file.gallery_id);
  db().prepare('DELETE FROM files WHERE id = ?').run(file.id);
  await storage.removePrefix(`g/${g.id}/${file.id}`);
  revalidatePath(`/dashboard/g/${g.id}`);
}

export async function updateBranding(fd: FormData) {
  const user = await requireUser();
  const studio = str(fd, 'studio').slice(0, 80) || user.studio_name;
  const accent = str(fd, 'accent');
  const color = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : user.accent_color;
  let logoKey = user.logo_key;
  const logo = fd.get('logo');
  if (fd.get('remove_logo')) logoKey = null;
  else if (logo instanceof File && logo.size > 0) {
    if (logo.size > 6 * 1024 * 1024) fail('/dashboard/settings', 'Das Logo darf höchstens 6 MB groß sein.');
    try {
      const png = await sharp(Buffer.from(await logo.arrayBuffer()))
        .resize({ width: 640, height: 240, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      logoKey = `logos/${user.id}/${Date.now()}.png`;
      await storage.removePrefix(`logos/${user.id}`);
      await storage.put(logoKey, png);
    } catch {
      fail('/dashboard/settings', 'Das Logo konnte nicht gelesen werden. Bitte PNG, JPG, WebP oder SVG verwenden.');
    }
  }
  db().prepare('UPDATE users SET studio_name = ?, accent_color = ?, logo_key = ? WHERE id = ?').run(studio, color, logoKey, user.id);
  // Wasserzeichen tragen den Studionamen: zwischengespeicherte Varianten verwerfen.
  if (studio !== user.studio_name) {
    const rows = db()
      .prepare('SELECT f.id, f.gallery_id FROM files f JOIN galleries g ON g.id = f.gallery_id WHERE g.user_id = ?')
      .all(user.id) as { id: string; gallery_id: string }[];
    await Promise.all(rows.map((r) => storage.removePrefix(storage.fileKey(r.gallery_id, r.id, 'preview-wm.webp'))));
  }
  redirect('/dashboard/settings?saved=1');
}

export async function unlockGallery(fd: FormData) {
  const slug = str(fd, 'slug');
  const g = galleryBySlug(slug);
  if (!g) redirect('/');
  const to = `/g/${path.posix.basename(slug)}`;
  if (rateLimited(await clientKey(`unlock:${g!.id}`))) fail(to, 'Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.');
  if (!g!.password_hash || !verifyPassword(String(fd.get('password') ?? ''), g!.password_hash)) fail(to, 'Das Passwort stimmt nicht.');
  await grantGalleryAccess(g!);
  redirect(to);
}
