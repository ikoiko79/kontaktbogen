import path from 'node:path';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db, newId } from '@/lib/db';
import { galleryById } from '@/lib/queries';
import { IMAGE_EXT, VIDEO_EXT, VIDEO_MIME, makeVariants } from '@/lib/images';
import * as storage from '@/lib/storage';

export const runtime = 'nodejs';
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 500) * 1024 * 1024;

const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  const g = galleryById((await params).id);
  if (!user || !g || g.user_id !== user.id) return err('Nicht erlaubt.', 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err('Der Upload konnte nicht gelesen werden.');
  }
  const file = form.get('file');
  if (!(file instanceof File)) return err('Keine Datei erhalten.');
  if (file.size > MAX_BYTES) return err('Die Datei ist zu groß.', 413);

  const name = path.basename(file.name).slice(0, 200) || 'datei';
  const ext = path.extname(name).toLowerCase();
  const kind = IMAGE_EXT.has(ext) ? 'image' : VIDEO_EXT.has(ext) ? 'video' : null;
  if (!kind) return err(`Dateityp ${ext || '(unbekannt)'} wird nicht unterstützt.`, 415);

  const id = newId();
  const buffer = Buffer.from(await file.arrayBuffer());
  let width: number | null = null;
  let height: number | null = null;
  let mime = VIDEO_MIME[ext] ?? file.type ?? 'application/octet-stream';

  if (kind === 'image') {
    try {
      const v = await makeVariants(buffer);
      width = v.width;
      height = v.height;
      mime = file.type || 'image/jpeg';
      await storage.put(storage.fileKey(g.id, id, 'thumb.webp'), v.thumb);
      await storage.put(storage.fileKey(g.id, id, 'preview.webp'), v.preview);
    } catch {
      await storage.removePrefix(`g/${g.id}/${id}`);
      return err('Das Bild konnte nicht verarbeitet werden.', 422);
    }
  }
  await storage.put(storage.fileKey(g.id, id, `original${ext}`), buffer);
  db()
    .prepare(
      'INSERT INTO files (id, gallery_id, name, mime, kind, size, width, height, ext, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, g.id, name, mime, kind, buffer.length, width, height, ext, Date.now());
  return NextResponse.json({ id, name });
}
