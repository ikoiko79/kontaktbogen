import Link from 'next/link';
import { logout } from '@/app/actions';
import { requireUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Logo href="/dashboard" />
          <nav className="nav">
            <Link href="/dashboard">Galerien</Link>
            <Link href="/dashboard/settings">Branding</Link>
            <span className="muted" style={{ fontSize: 14 }}>{user.studio_name}</span>
            <form action={logout}>
              <button className="btn ghost small" type="submit">Abmelden</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="page">
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
