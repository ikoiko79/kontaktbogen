import { Readable } from 'node:stream';
import { db, type FileRow } from '@/lib/db';
import { accessFor, galleryById, userById } from '@/lib/queries';
import { watermark } from '@/lib/images';
import * as storage from '@/lib/storage';

export const runtime = 'nodejs';

const deny = (status: number) => new Response(null, { status });

export async function GET(req: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant } = await params;
  const file = db().prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRow | undefined;
  const g = file && galleryById(file.gallery_id);
  if (!file || !g) return deny(404);
  const access = await accessFor(g);
  if (!access) return deny(403);

  const download = new URL(req.url).searchParams.has('download');
  let key: string;
  let type: string;

  if (variant === 'original') {
    // Videos werden aus dem Original abgespielt; der Download als Datei
    // und Bild-Originale brauchen die Download-Freigabe.
    const playback = file.kind === 'video' && !download;
    if (access !== 'owner' && !g.allow_download && !playback) return deny(403);
    key = storage.fileKey(g.id, file.id, `original${file.ext}`);
    type = file.mime;
  } else if ((variant === 'thumb' || variant === 'preview') && file.kind === 'image') {
    type = 'image/webp';
    key = storage.fileKey(g.id, file.id, `${variant}.webp`);
    if (variant === 'preview' && g.watermark && access !== 'owner') {
      const wmKey = storage.fileKey(g.id, file.id, 'preview-wm.webp');
      if (!(await storage.stat(wmKey))) {
        const owner = userById(g.user_id);
        await storage.put(wmKey, await watermark(await storage.get(key), owner?.studio_name || 'Vorschau'));
      }
      key = wmKey;
    }
  } else {
    return deny(404);
  }

  const st = await storage.stat(key);
  if (!st) return deny(404);

  const headers = new Headers({
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  if (download) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
    let end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) {
      headers.set('Content-Range', `bytes */${st.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${st.size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(Readable.toWeb(storage.stream(key, { start, end })) as ReadableStream, { status: 206, headers });
  }
  headers.set('Content-Length', String(st.size));
  return new Response(Readable.toWeb(storage.stream(key)) as ReadableStream, { headers });
}
