'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GFile = { id: string; name: string; kind: 'image' | 'video' };
type Fav = { file_id: string; visitor: string };
type Cmt = { id: string; file_id: string; visitor: string; body: string; created_at: number };
type Props = {
  gallery: {
    slug: string;
    title: string;
    description: string;
    allowDownload: boolean;
    allowComments: boolean;
    allowSelection: boolean;
    approvedAt: number | null;
    approvedBy: string | null;
  };
  studio: { name: string; logo: string | null };
  files: GFile[];
  favorites: Fav[];
  comments: Cmt[];
};

const VISITOR_KEY = 'kb_visitor';
const fmt = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function GalleryView({ gallery, studio, files, favorites: initialFavs, comments: initialComments }: Props) {
  const [visitor, setVisitor] = useState('');
  const [favs, setFavs] = useState(initialFavs);
  const [comments, setComments] = useState(initialComments);
  const [approved, setApproved] = useState<{ at: number; by: string } | null>(
    gallery.approvedAt ? { at: gallery.approvedAt, by: gallery.approvedBy ?? '' } : null
  );
  const [onlyMine, setOnlyMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const nameDialog = useRef<HTMLDialogElement>(null);
  const approveDialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<((name: string) => void) | null>(null);

  useEffect(() => {
    try {
      setVisitor(localStorage.getItem(VISITOR_KEY) ?? '');
    } catch {}
  }, []);

  const mine = useMemo(() => new Set(favs.filter((f) => f.visitor === visitor).map((f) => f.file_id)), [favs, visitor]);
  const commentCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of comments) m.set(c.file_id, (m.get(c.file_id) ?? 0) + 1);
    return m;
  }, [comments]);
  const shown = onlyMine ? files.filter((f) => mine.has(f.id)) : files;
  const index = open ? shown.findIndex((f) => f.id === open) : -1;
  const current = index >= 0 ? shown[index] : null;
  const canPick = gallery.allowSelection && !approved;
  const hasPanel = gallery.allowComments;

  // Fragt beim ersten Mal nach dem Namen und führt die Aktion danach aus.
  const withName = useCallback(
    (run: (name: string) => void) => {
      if (visitor) return run(visitor);
      pending.current = run;
      nameDialog.current?.showModal();
    },
    [visitor]
  );

  const post = useCallback(
    async (name: string, body: Record<string, unknown>) => {
      setError('');
      const res = await fetch(`/api/g/${gallery.slug}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, visitor: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Das hat nicht geklappt. Bitte noch einmal versuchen.');
      return data;
    },
    [gallery.slug]
  );

  const toggle = useCallback(
    (fileId: string) => {
      if (!canPick) return;
      withName(async (name) => {
        const on = !favs.some((f) => f.file_id === fileId && f.visitor === name);
        const before = favs;
        setFavs((prev) =>
          on ? [...prev, { file_id: fileId, visitor: name }] : prev.filter((f) => !(f.file_id === fileId && f.visitor === name))
        );
        try {
          await post(name, { type: 'favorite', fileId, on });
        } catch (e) {
          setFavs(before);
          setError((e as Error).message);
        }
      });
    },
    [canPick, favs, post, withName]
  );

  const step = useCallback(
    (d: number) => {
      if (index < 0) return;
      setOpen(shown[(index + d + shown.length) % shown.length].id);
      setDraft('');
    },
    [index, shown]
  );

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const typing = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      if (e.key === 'Escape') setOpen(null);
      else if (typing) return;
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key.toLowerCase() === 'f') toggle(current.id);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [current, step, toggle]);

  function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !current) return;
    const fileId = current.id;
    withName(async (name) => {
      try {
        const data = await post(name, { type: 'comment', fileId, body: text });
        setComments((prev) => [...prev, data.comment]);
        setDraft('');
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function approve() {
    approveDialog.current?.close();
    withName(async (name) => {
      try {
        const data = await post(name, { type: 'approve' });
        setApproved({ at: data.approved_at, by: data.approved_by });
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const zip = `/api/g/${gallery.slug}/zip`;

  return (
    <>
      <header className="g-head">
        <div className="wrap">
          <div className="g-brand">
            {studio.logo ? <img src={studio.logo} alt={studio.name} /> : <span>{studio.name}</span>}
          </div>
          <h1>{gallery.title}</h1>
          {gallery.description && <p className="desc">{gallery.description}</p>}
        </div>
      </header>

      <div className="bar">
        <div className="wrap">
          <div className="group">
            <span className="mono">
              {files.length} {files.length === 1 ? 'Datei' : 'Dateien'}
              {gallery.allowSelection && ` · ${mine.size} ausgewählt`}
            </span>
            {gallery.allowSelection && mine.size > 0 && (
              <button className="btn small ghost" type="button" aria-pressed={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
                {onlyMine ? 'Alle zeigen' : 'Nur meine Auswahl'}
              </button>
            )}
            {visitor && (
              <button className="icon-btn" type="button" onClick={() => nameDialog.current?.showModal()}>
                als {visitor}
              </button>
            )}
          </div>
          <div className="group">
            {gallery.allowDownload && files.length > 0 && (
              <>
                {mine.size > 0 && (
                  <a className="btn small ghost" href={`${zip}?favorites=${encodeURIComponent(visitor)}`}>Auswahl laden</a>
                )}
                <a className="btn small ghost" href={zip}>Alle laden (ZIP)</a>
              </>
            )}
            {approved ? (
              <span className="chip ok">freigegeben von {approved.by}</span>
            ) : (
              gallery.allowSelection &&
              mine.size > 0 && (
                <button className="btn small accent" type="button" onClick={() => approveDialog.current?.showModal()}>
                  Auswahl abschließen
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <main className="g-body">
        <div className="wrap">
          {error && !current && <p className="notice" role="alert">{error}</p>}
          {files.length === 0 ? (
            <p className="empty">In dieser Galerie liegen noch keine Dateien.</p>
          ) : (
            <div className="grid">
              {shown.map((f) => {
                const n = files.indexOf(f) + 1;
                const picked = mine.has(f.id);
                return (
                  <div key={f.id} className={`cellbox${picked ? ' picked' : ''}`}>
                    <button className="thumb" type="button" onClick={() => setOpen(f.id)} aria-label={`${f.name} groß ansehen`}>
                      {f.kind === 'image' ? (
                        <img src={`/api/files/${f.id}/thumb`} alt="" loading="lazy" />
                      ) : (
                        <>
                          <video src={`/api/files/${f.id}/original#t=0.1`} preload="metadata" muted playsInline />
                          <span className="play" aria-hidden>▶</span>
                        </>
                      )}
                    </button>
                    <div className="cap">
                      <span className="name" title={f.name}>
                        <b>{String(n).padStart(2, '0')}</b>
                        {f.name}
                        {commentCount.get(f.id) ? ` · ${commentCount.get(f.id)} Komm.` : ''}
                      </span>
                      {gallery.allowSelection && (
                        <button
                          className="pick-btn"
                          type="button"
                          aria-pressed={picked}
                          disabled={!canPick}
                          onClick={() => toggle(f.id)}
                          aria-label={picked ? `${f.name} aus der Auswahl nehmen` : `${f.name} auswählen`}
                        >
                          {picked ? '✓' : '○'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {current && (
        <div className={`lb${hasPanel ? '' : ' nopanel'}`} role="dialog" aria-modal="true" aria-label={current.name}>
          <div className="lb-top">
            <span className="name">
              {String(files.indexOf(current) + 1).padStart(2, '0')} / {String(files.length).padStart(2, '0')} · {current.name}
            </span>
            <div className="group">
              {gallery.allowSelection && (
                <button className="btn small" type="button" aria-pressed={mine.has(current.id)} disabled={!canPick} onClick={() => toggle(current.id)}>
                  {mine.has(current.id) ? '✓ Ausgewählt' : 'Auswählen'}
                </button>
              )}
              {gallery.allowDownload && (
                <a className="btn small" href={`/api/files/${current.id}/original?download`}>Laden</a>
              )}
              <button className="btn small" type="button" onClick={() => setOpen(null)} autoFocus>Schließen</button>
            </div>
          </div>
          <div className="lb-stage">
            {current.kind === 'image' ? (
              <img key={current.id} src={`/api/files/${current.id}/preview`} alt={current.name} />
            ) : (
              <video key={current.id} src={`/api/files/${current.id}/original`} controls playsInline />
            )}
            {shown.length > 1 && (
              <>
                <button className="lb-nav prev" type="button" onClick={() => step(-1)} aria-label="Vorheriges Bild">‹</button>
                <button className="lb-nav next" type="button" onClick={() => step(1)} aria-label="Nächstes Bild">›</button>
              </>
            )}
          </div>
          {hasPanel && (
            <aside className="lb-side">
              <h2>Kommentare</h2>
              <div className="lb-list">
                {comments.filter((c) => c.file_id === current.id).length === 0 && (
                  <p className="muted" style={{ fontSize: 14 }}>Noch keine Kommentare zu diesem Bild.</p>
                )}
                {comments
                  .filter((c) => c.file_id === current.id)
                  .map((c) => (
                    <div className="cmt" key={c.id}>
                      <p className="mono muted">{c.visitor} · {fmt.format(c.created_at)}</p>
                      <p>{c.body}</p>
                    </div>
                  ))}
              </div>
              <form className="lb-form" onSubmit={sendComment}>
                {error && <p className="notice" role="alert" style={{ color: '#16140f', margin: 0 }}>{error}</p>}
                <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Wunsch oder Anmerkung zu diesem Bild" aria-label="Kommentar" maxLength={2000} />
                <button className="btn small" type="submit" disabled={!draft.trim()}>Kommentar senden</button>
              </form>
            </aside>
          )}
        </div>
      )}

      <dialog className="dlg" ref={nameDialog} onClose={() => (pending.current = null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get('name') ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
            if (!name) return;
            try {
              localStorage.setItem(VISITOR_KEY, name);
            } catch {}
            setVisitor(name);
            const run = pending.current;
            pending.current = null;
            nameDialog.current?.close();
            run?.(name);
          }}
        >
          <h2>Wie heißt du?</h2>
          <p className="muted" style={{ marginBottom: 14 }}>Damit {studio.name} weiß, von wem Auswahl und Kommentare stammen.</p>
          <input className="input" name="name" defaultValue={visitor} placeholder="Vor- und Nachname" aria-label="Dein Name" maxLength={60} required autoFocus />
          <div className="row">
            <button className="btn ghost small" type="button" onClick={() => nameDialog.current?.close()}>Abbrechen</button>
            <button className="btn small" type="submit">Weiter</button>
          </div>
        </form>
      </dialog>

      <dialog className="dlg" ref={approveDialog}>
        <h2>Auswahl abschließen?</h2>
        <p>
          Du gibst {mine.size} {mine.size === 1 ? 'Bild' : 'Bilder'} frei. Danach lässt sich die Auswahl nur noch von {studio.name} wieder öffnen.
        </p>
        <div className="row">
          <button className="btn ghost small" type="button" onClick={() => approveDialog.current?.close()}>Noch nicht</button>
          <button className="btn accent small" type="button" onClick={approve}>Auswahl abschließen</button>
        </div>
      </dialog>
    </>
  );
}
