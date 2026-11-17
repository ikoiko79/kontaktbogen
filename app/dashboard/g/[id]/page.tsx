import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { deleteFile, deleteGallery, reopenGallery, updateGallery } from '@/app/actions';
import { requireUser } from '@/lib/auth';
import { commentsOf, favoritesOf, filesOf, galleryById } from '@/lib/queries';
import { Uploader } from '@/components/Uploader';
import { ConfirmButton, CopyButton } from '@/components/Small';

const fmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export default async function GalleryAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser();
  const g = galleryById((await params).id);
  if (!g || g.user_id !== user.id) notFound();
  const { saved } = await searchParams;

  const files = filesOf(g.id);
  const favorites = favoritesOf(g.id);
  const comments = commentsOf(g.id);
  const byId = new Map(files.map((f) => [f.id, f]));
  const picked = new Set(favorites.map((f) => f.file_id));
  const visitors = new Map<string, string[]>();
  for (const f of favorites) {
    const name = byId.get(f.file_id)?.name;
    if (name) visitors.set(f.visitor, [...(visitors.get(f.visitor) ?? []), name]);
  }

  const h = await headers();
  const origin = process.env.PUBLIC_URL || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const link = `${origin}/g/${g.slug}`;

  return (
    <>
      <p className="mono" style={{ marginBottom: 10 }}>
        <Link href="/dashboard">← Alle Galerien</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>{g.title}</h1>
          <p className="mono muted" style={{ marginTop: 8 }}>
            {files.length} {files.length === 1 ? 'Datei' : 'Dateien'} · {picked.size} ausgewählt · {comments.length} {comments.length === 1 ? "Kommentar" : "Kommentare"}
          </p>
        </div>
        <a className="btn ghost" href={`/g/${g.slug}`} target="_blank" rel="noreferrer">Kundenansicht öffnen</a>
      </div>

      <div className="cols">
        <div>
          <Uploader galleryId={g.id} />
          {files.length === 0 ? (
            <p className="empty">Noch keine Dateien in dieser Galerie.</p>
          ) : (
            <div className="grid">
              {files.map((f, i) => (
                <div key={f.id} className={`cellbox${picked.has(f.id) ? ' picked' : ''}`}>
                  <a className="thumb" href={`/api/files/${f.id}/${f.kind === 'image' ? 'preview' : 'original'}`} target="_blank" rel="noreferrer">
                    {f.kind === 'image' ? (
                      <img src={`/api/files/${f.id}/thumb`} alt={f.name} loading="lazy" />
                    ) : (
                      <>
                        <video src={`/api/files/${f.id}/original#t=0.1`} preload="metadata" muted />
                        <span className="play" aria-hidden>▶</span>
                      </>
                    )}
                  </a>
                  <div className="cap">
                    <span className="name" title={f.name}>
                      <b>{String(i + 1).padStart(2, '0')}</b>
                      {f.name}
                    </span>
                    <form action={deleteFile}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmButton className="icon-btn" question={`„${f.name}“ wirklich löschen?`}>Löschen</ConfirmButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside>
          <section className="panel">
            <h2>Link für Kunden</h2>
            <div className="share">
              <input className="input" readOnly value={link} aria-label="Link zur Galerie" />
              <CopyButton text={link} />
            </div>
            <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
              {g.password_hash ? 'Mit Passwort geschützt.' : 'Jeder mit diesem Link kann die Galerie sehen.'}
            </p>
          </section>

          <section className="panel">
            <h2>Auswahl</h2>
            {g.approved_at ? (
              <form action={reopenGallery} style={{ marginBottom: 12 }}>
                <input type="hidden" name="id" value={g.id} />
                <p style={{ marginBottom: 10 }}>
                  <span className="chip ok">freigegeben</span> von {g.approved_by} am {fmt.format(g.approved_at)}
                </p>
                <button className="btn small ghost" type="submit">Auswahl wieder öffnen</button>
              </form>
            ) : (
              <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>Noch nicht abgeschlossen.</p>
            )}
            {visitors.size === 0 && <p className="muted" style={{ fontSize: 14 }}>Bisher hat niemand Favoriten markiert.</p>}
            {[...visitors].map(([name, names]) => (
              <div className="who" key={name}>
                <header>
                  <strong>{name}</strong>
                  <span className="mono muted">{names.length} Bilder</span>
                </header>
                <textarea className="input" readOnly rows={3} value={names.join(', ')} aria-label={`Dateinamen der Auswahl von ${name}`} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <CopyButton text={names.join(', ')} label="Dateinamen kopieren" />
                  <a className="btn small ghost" href={`/api/g/${g.slug}/zip?favorites=${encodeURIComponent(name)}`}>Als ZIP</a>
                </div>
              </div>
            ))}
          </section>

          {comments.length > 0 && (
            <section className="panel">
              <h2>Kommentare</h2>
              {comments.map((c) => (
                <div className="cmt" key={c.id}>
                  <p className="mono muted">
                    {byId.get(c.file_id)?.name} · {c.visitor} · {fmt.format(c.created_at)}
                  </p>
                  <p>{c.body}</p>
                </div>
              ))}
            </section>
          )}

          <section className="panel">
            <h2>Einstellungen</h2>
            {saved && <p className="notice ok" role="status">Gespeichert.</p>}
            <form action={updateGallery}>
              <input type="hidden" name="id" value={g.id} />
              <div className="field">
                <label htmlFor="title">Titel</label>
                <input className="input" id="title" name="title" defaultValue={g.title} maxLength={120} required />
              </div>
              <div className="field">
                <label htmlFor="description">Nachricht an Kunden</label>
                <textarea className="input" id="description" name="description" defaultValue={g.description} maxLength={1000} />
              </div>
              <label className="check"><input type="checkbox" name="allow_selection" defaultChecked={!!g.allow_selection} /> Favoriten und Freigabe erlauben</label>
              <label className="check"><input type="checkbox" name="allow_comments" defaultChecked={!!g.allow_comments} /> Kommentare erlauben</label>
              <label className="check"><input type="checkbox" name="allow_download" defaultChecked={!!g.allow_download} /> Download der Originale erlauben</label>
              <label className="check"><input type="checkbox" name="watermark" defaultChecked={!!g.watermark} /> Wasserzeichen auf Foto-Vorschauen</label>
              <div className="field" style={{ marginTop: 14 }}>
                <label htmlFor="password">{g.password_hash ? 'Neues Passwort setzen' : 'Passwort setzen'}</label>
                <input className="input" id="password" name="password" type="text" autoComplete="off" placeholder={g.password_hash ? 'Leer lassen, um es zu behalten' : 'Leer lassen für keinen Schutz'} />
              </div>
              {g.password_hash && (
                <label className="check"><input type="checkbox" name="remove_password" /> Passwortschutz entfernen</label>
              )}
              <button className="btn" type="submit">Speichern</button>
            </form>
          </section>

          <form action={deleteGallery}>
            <input type="hidden" name="id" value={g.id} />
            <ConfirmButton className="btn small danger" question={`Galerie „${g.title}“ mit allen Dateien endgültig löschen?`}>
              Galerie löschen
            </ConfirmButton>
          </form>
        </aside>
      </div>
    </>
  );
}
