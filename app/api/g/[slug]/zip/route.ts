import { Readable } from 'node:stream';
import { ZipArchive } from 'archiver';
import { accessFor, cleanVisitor, favoritesOf, filesOf, galleryBySlug } from '@/lib/queries';
import * as storage from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = galleryBySlug((await params).slug);
  if (!g) return new Response(null, { status: 404 });
  const access = await accessFor(g);
  if (!access || (access !== 'owner' && !g.allow_download)) return new Response(null, { status: 403 });

  const q = new URL(req.url).searchParams;
  let files = filesOf(g.id);
  const visitor = cleanVisitor(q.get('favorites'));
  if (q.has('favorites')) {
    const favs = favoritesOf(g.id).filter((f) => !visitor || f.visitor === visitor);
    const ids = new Set(favs.map((f) => f.file_id));
    files = files.filter((f) => ids.has(f.id));
  }
  if (!files.length) return new Response('Keine Dateien.', { status: 404 });

  // Fotos und Videos sind bereits komprimiert: nur packen, nicht erneut komprimieren.
  const zip = new ZipArchive({ store: true });
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name;
    for (let i = 2; used.has(name.toLowerCase()); i++) name = f.name.replace(/(\.[^.]*)?$/, `-${i}$1`);
    used.add(name.toLowerCase());
    zip.file(storage.keyPath(storage.fileKey(g.id, f.id, `original${f.ext}`)), { name });
  }
  zip.on('error', () => zip.destroy());
  void zip.finalize();

  const filename = `${g.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'galerie'}.zip`;
  return new Response(Readable.toWeb(zip) as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
