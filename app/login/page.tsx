import Link from 'next/link';
import { redirect } from 'next/navigation';
import { login } from '@/app/actions';
import { currentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Anmelden' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect('/dashboard');
  const { error } = await searchParams;
  return (
    <main className="auth">
      <Logo />
      <h1 style={{ marginTop: 28 }}>Anmelden</h1>
      <form action={login}>
        {error && <p className="notice" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="email">E-Mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Passwort</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn" type="submit">Anmelden</button>
      </form>
      <p className="muted" style={{ marginTop: 20 }}>
        Noch kein Konto? <Link href="/register">Konto anlegen</Link>
      </p>
    </main>
  );
}
