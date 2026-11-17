import { NextResponse } from 'next/server';
import { db, newId } from '@/lib/db';
import { accessFor, cleanVisitor, galleryBySlug } from '@/lib/queries';

export const runtime = 'nodejs';
const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = galleryBySlug((await params).slug);
  if (!g) return err('Galerie nicht gefunden.', 404);
  if (!(await accessFor(g))) return err('Kein Zugang.', 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err('Ungültige Anfrage.');
  }
  const visitor = cleanVisitor(body.visitor);
  if (!visitor) return err('Bitte zuerst einen Namen angeben.');

  const fileInGallery = (id: unknown) =>
    typeof id === 'string' && !!db().prepare('SELECT 1 FROM files WHERE id = ? AND gallery_id = ?').get(id, g.id);

  switch (body.type) {
    case 'favorite': {
      if (!g.allow_selection) return err('Die Auswahl ist für diese Galerie deaktiviert.', 403);
      if (g.approved_at) return err('Die Auswahl wurde bereits abgeschlossen.', 409);
      if (!fileInGallery(body.fileId)) return err('Datei nicht gefunden.', 404);
      if (body.on)
        db()
          .prepare('INSERT OR IGNORE INTO favorites (file_id, gallery_id, visitor, created_at) VALUES (?, ?, ?, ?)')
          .run(body.fileId, g.id, visitor, Date.now());
      else db().prepare('DELETE FROM favorites WHERE file_id = ? AND visitor = ?').run(body.fileId, visitor);
      return NextResponse.json({ ok: true });
    }
    case 'comment': {
      if (!g.allow_comments) return err('Kommentare sind für diese Galerie deaktiviert.', 403);
      if (!fileInGallery(body.fileId)) return err('Datei nicht gefunden.', 404);
      const text = typeof body.body === 'string' ? body.body.trim().slice(0, 2000) : '';
      if (!text) return err('Der Kommentar ist leer.');
      const comment = { id: newId(), file_id: body.fileId as string, visitor, body: text, created_at: Date.now() };
      db()
        .prepare('INSERT INTO comments (id, file_id, gallery_id, visitor, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(comment.id, comment.file_id, g.id, visitor, text, comment.created_at);
      return NextResponse.json({ ok: true, comment });
    }
    case 'approve': {
      if (!g.allow_selection) return err('Die Auswahl ist für diese Galerie deaktiviert.', 403);
      if (g.approved_at) return err('Die Auswahl wurde bereits abgeschlossen.', 409);
      const now = Date.now();
      db().prepare('UPDATE galleries SET approved_at = ?, approved_by = ? WHERE id = ?').run(now, visitor, g.id);
      return NextResponse.json({ ok: true, approved_at: now, approved_by: visitor });
    }
    default:
      return err('Unbekannte Aktion.');
  }
}
