import Link from 'next/link';
import { redirect } from 'next/navigation';
import { register } from '@/app/actions';
import { currentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Konto anlegen' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect('/dashboard');
  const { error } = await searchParams;
  return (
    <main className="auth">
      <Logo />
      <h1 style={{ marginTop: 28 }}>Konto anlegen</h1>
      <p className="muted">Der Studioname erscheint in deinen Kundengalerien.</p>
      <form action={register}>
        {error && <p className="notice" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="studio">Studio oder Agentur</label>
          <input className="input" id="studio" name="studio" maxLength={80} autoComplete="organization" required />
        </div>
        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Passwort (mindestens 10 Zeichen)</label>
          <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
        </div>
        <button className="btn" type="submit">Konto anlegen</button>
      </form>
      <p className="muted" style={{ marginTop: 20 }}>
        Schon dabei? <Link href="/login">Anmelden</Link>
      </p>
    </main>
  );
}
