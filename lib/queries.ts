import { db, type Gallery, type FileRow, type User, type Favorite, type Comment } from './db';
import { currentUser, hasGalleryAccess } from './auth';

export const galleryBySlug = (slug: string) =>
  db().prepare('SELECT * FROM galleries WHERE slug = ?').get(slug) as Gallery | undefined;

export const galleryById = (id: string) =>
  db().prepare('SELECT * FROM galleries WHERE id = ?').get(id) as Gallery | undefined;

export const userById = (id: string) => db().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;

export const filesOf = (galleryId: string) =>
  db().prepare('SELECT * FROM files WHERE gallery_id = ? ORDER BY name COLLATE NOCASE, created_at').all(galleryId) as FileRow[];

export const favoritesOf = (galleryId: string) =>
  db().prepare('SELECT file_id, visitor FROM favorites WHERE gallery_id = ? ORDER BY created_at').all(galleryId) as Favorite[];

export const commentsOf = (galleryId: string) =>
  db()
    .prepare('SELECT id, file_id, visitor, body, created_at FROM comments WHERE gallery_id = ? ORDER BY created_at')
    .all(galleryId) as Comment[];

// Wer darf die Galerie sehen? Besitzer immer, Besucher nur mit Zugang.
export async function accessFor(g: Gallery): Promise<'owner' | 'visitor' | null> {
  const user = await currentUser();
  if (user && user.id === g.user_id) return 'owner';
  return (await hasGalleryAccess(g)) ? 'visitor' : null;
}

export const cleanVisitor = (v: unknown): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
