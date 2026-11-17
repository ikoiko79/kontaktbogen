import Link from 'next/link';
import { brand } from '@/lib/brand';
import { currentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';

const TONES = ['#8a7f6a', '#b7a888', '#5e6a5a', '#a08c7a', '#c9bfa6', '#70685a', '#9aa08a', '#bfae94', '#665f52', '#ad9f86', '#84897a', '#d3c8ad'];

export default async function Home() {
  const user = await currentUser();
  const start = user ? '/dashboard' : '/register';
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Logo />
          <nav className="nav">
            <a href="#funktionen">Funktionen</a>
            <a href="#preise">Preise</a>
            {user ? (
              <Link className="btn small" href="/dashboard">Zu meinen Galerien</Link>
            ) : (
              <>
                <Link href="/login">Anmelden</Link>
                <Link className="btn small" href="/register">Konto anlegen</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <div>
              <p className="eyebrow">Kundengalerien für Fotografen und Agenturen</p>
              <h1>{brand.claim}</h1>
              <p className="lead">
                Lade ein Shooting hoch, schick einen Link und lass deine Kunden direkt im Browser ihre Favoriten
                markieren. Du bekommst eine saubere Liste statt zwanzig E-Mails mit Dateinamen.
              </p>
              <div className="cta">
                <Link className="btn accent" href={start}>Erste Galerie anlegen</Link>
                <a className="btn ghost" href="#ablauf">So läuft es ab</a>
              </div>
            </div>
            <div className="sheet" aria-hidden>
              {TONES.map((c, i) => (
                <div key={i} className={`frame${i === 5 || i === 10 ? ' pick' : ''}`}>
                  <b style={{ background: c }} />
                  <span>{String(i + 1).padStart(2, '0')}A</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="band" id="ablauf">
          <div className="wrap">
            <p className="eyebrow">Ablauf</p>
            <h2>Vom Export bis zur Freigabe in drei Schritten.</h2>
            <ol className="steps">
              <li>
                <h3>Hochladen</h3>
                <p>Zieh Fotos und Videos in eine Galerie. Vorschauen entstehen automatisch, die Originale bleiben unangetastet.</p>
              </li>
              <li>
                <h3>Link teilen</h3>
                <p>Deine Kunden brauchen kein Konto. Auf Wunsch schützt du die Galerie mit einem Passwort und einem Wasserzeichen.</p>
              </li>
              <li>
                <h3>Auswahl erhalten</h3>
                <p>Favoriten, Kommentare und die abschließende Freigabe landen bei dir, fertig als Dateiliste für die Bearbeitung.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="band" id="funktionen">
          <div className="wrap">
            <p className="eyebrow">Funktionen</p>
            <h2>Alles, was zwischen Shooting und Rechnung liegt.</h2>
            <div className="feats">
              <div>
                <h3>Favoriten wie auf dem Kontaktbogen</h3>
                <p>Ein Klick kreist ein Bild ein. Mehrere Personen können getrennt auswählen, du siehst jede Auswahl einzeln.</p>
              </div>
              <div>
                <h3>Kommentare am Bild</h3>
                <p>Retuschewünsche stehen direkt beim Motiv, nicht in einem Chatverlauf, den niemand wiederfindet.</p>
              </div>
              <div>
                <h3>Freigabe mit Name und Zeitpunkt</h3>
                <p>Wenn die Auswahl steht, schließt dein Kunde sie ab. Danach ist sie gesperrt, bis du sie wieder öffnest.</p>
              </div>
              <div>
                <h3>Downloads einzeln oder als ZIP</h3>
                <p>Die ganze Galerie oder nur die Favoriten, in Originalqualität. Du entscheidest, ob Downloads erlaubt sind.</p>
              </div>
              <div>
                <h3>Dein Auftritt, nicht unserer</h3>
                <p>Logo, Studioname und Akzentfarbe gehören dir. Deine Kunden sehen deine Marke.</p>
              </div>
              <div>
                <h3>Passwort und Wasserzeichen</h3>
                <p>Schütze Galerien vor fremden Blicken und Vorschauen vor ungeklärter Nutzung, bis alles freigegeben ist.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band" id="preise">
          <div className="wrap">
            <p className="eyebrow">Preise</p>
            <h2>Ein Preis pro Team, keine Kosten für deine Kunden.</h2>
            <div className="plans">
              {brand.plans.map((p) => (
                <div key={p.name} className={`plan${'featured' in p && p.featured ? ' featured' : ''}`}>
                  <h3 style={{ fontSize: 24 }}>{p.name}</h3>
                  <p className="price">{p.price}</p>
                  <p className="muted">{p.unit}</p>
                  <ul>
                    {p.points.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <Link className={`btn${'featured' in p && p.featured ? '' : ' ghost'}`} href={start}>
                    {p.name} wählen
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="closing">
          <div className="wrap">
            <h2>Die nächste Auswahl kommt als Liste, nicht als E-Mail-Kette.</h2>
            <Link className="btn accent" href={start}>Erste Galerie anlegen</Link>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {brand.name}</span>
          <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a>
        </div>
      </footer>
    </>
  );
}
