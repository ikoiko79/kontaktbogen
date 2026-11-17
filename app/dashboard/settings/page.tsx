import { updateBranding } from '@/app/actions';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Branding' };

export default async function Settings({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const { error, saved } = await searchParams;
  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-head">
        <h1>Branding</h1>
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>So treten deine Galerien gegenüber Kunden auf.</p>
      {error && <p className="notice" role="alert">{error}</p>}
      {saved && <p className="notice ok" role="status">Gespeichert.</p>}
      <form action={updateBranding} className="panel">
        <div className="field">
          <label htmlFor="studio">Studio oder Agentur</label>
          <input className="input" id="studio" name="studio" defaultValue={user.studio_name} maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="accent">Akzentfarbe</label>
          <input id="accent" name="accent" type="color" defaultValue={user.accent_color} style={{ width: 64, height: 42, padding: 2 }} />
        </div>
        <div className="field">
          <label htmlFor="logo">Logo</label>
          {user.logo_key && (
            <img src={`/api/logo/${user.id}?v=${encodeURIComponent(user.logo_key)}`} alt="Aktuelles Logo" style={{ maxHeight: 56, width: 'auto', marginBottom: 6 }} />
          )}
          <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
          <span className="muted" style={{ fontSize: 14 }}>PNG, JPG, WebP oder SVG, höchstens 6 MB.</span>
        </div>
        {user.logo_key && (
          <label className="check"><input type="checkbox" name="remove_logo" /> Logo entfernen</label>
        )}
        <button className="btn" type="submit">Speichern</button>
      </form>
    </div>
  );
}
