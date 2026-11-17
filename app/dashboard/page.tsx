import Link from 'next/link';
import { createGallery } from '@/app/actions';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const metadata = { title: 'Galerien' };

type Row = {
  id: string;
  title: string;
  created_at: number;
  approved_at: number | null;
  file_count: number;
  fav_count: number;
  cover: string | null;
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const rows = db()
    .prepare(
      `SELECT g.id, g.title, g.created_at, g.approved_at,
        (SELECT COUNT(*) FROM files f WHERE f.gallery_id = g.id) AS file_count,
        (SELECT COUNT(DISTINCT file_id) FROM favorites v WHERE v.gallery_id = g.id) AS fav_count,
        (SELECT f.id FROM files f WHERE f.gallery_id = g.id AND f.kind = 'image' ORDER BY f.name COLLATE NOCASE LIMIT 1) AS cover
       FROM galleries g WHERE g.user_id = ? ORDER BY g.created_at DESC`
    )
    .all(user.id) as Row[];

  return (
    <>
      <div className="page-head">
        <h1>Galerien</h1>
        <form action={createGallery} className="inline-form">
          <input className="input" name="title" placeholder="Titel, z. B. Hochzeit Lena und Jonas" aria-label="Titel der neuen Galerie" maxLength={120} required />
          <button className="btn" type="submit">Galerie anlegen</button>
        </form>
      </div>
      {error && <p className="notice" role="alert">{error}</p>}
      {rows.length === 0 ? (
        <p className="empty">Noch keine Galerie. Gib oben einen Titel ein und leg die erste an.</p>
      ) : (
        <div className="cards">
          {rows.map((g) => (
            <Link key={g.id} href={`/dashboard/g/${g.id}`} className="gcard">
              <div className="cover">
                {g.cover ? <img src={`/api/files/${g.cover}/thumb`} alt="" loading="lazy" /> : <span className="mono muted">leer</span>}
              </div>
              <div className="meta">
                <h3>{g.title}</h3>
                <p className="mono muted">
                  {g.file_count} {g.file_count === 1 ? 'Datei' : 'Dateien'} · {g.fav_count} ausgewählt
                  {g.approved_at ? ' · freigegeben' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
