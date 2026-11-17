import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unlockGallery } from '@/app/actions';
import { accessFor, commentsOf, favoritesOf, filesOf, galleryBySlug, userById } from '@/lib/queries';
import { GalleryView } from '@/components/GalleryView';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = galleryBySlug((await params).slug);
  const owner = g && userById(g.user_id);
  // Kundengalerien gehören nicht in Suchmaschinen.
  return { title: { absolute: g ? `${g.title} – ${owner?.studio_name ?? ''}` : 'Galerie' }, robots: { index: false, follow: false } };
}

export default async function PublicGallery({ params, searchParams }: Props) {
  const g = galleryBySlug((await params).slug);
  if (!g) notFound();
  const owner = userById(g.user_id);
  if (!owner) notFound();
  const logo = owner.logo_key ? `/api/logo/${owner.id}?v=${encodeURIComponent(owner.logo_key)}` : null;
  const style = { '--accent': owner.accent_color } as React.CSSProperties;

  if (!(await accessFor(g))) {
    const { error } = await searchParams;
    return (
      <main className="lock" style={style}>
        {logo ? <img src={logo} alt={owner.studio_name} style={{ maxHeight: 56, width: 'auto', margin: '0 auto' }} /> : <p className="eyebrow">{owner.studio_name}</p>}
        <h1>{g.title}</h1>
        <p className="muted">Diese Galerie ist mit einem Passwort geschützt.</p>
        <form action={unlockGallery}>
          <input type="hidden" name="slug" value={g.slug} />
          {error && <p className="notice" role="alert">{error}</p>}
          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input className="input" id="password" name="password" type="password" autoFocus required />
          </div>
          <button className="btn accent" type="submit">Galerie öffnen</button>
        </form>
      </main>
    );
  }

  return (
    <div style={style}>
      <GalleryView
        gallery={{
          slug: g.slug,
          title: g.title,
          description: g.description,
          allowDownload: !!g.allow_download,
          allowComments: !!g.allow_comments,
          allowSelection: !!g.allow_selection,
          approvedAt: g.approved_at,
          approvedBy: g.approved_by,
        }}
        studio={{ name: owner.studio_name, logo }}
        files={filesOf(g.id).map((f) => ({ id: f.id, name: f.name, kind: f.kind }))}
        favorites={favoritesOf(g.id)}
        comments={commentsOf(g.id)}
      />
    </div>
  );
}
