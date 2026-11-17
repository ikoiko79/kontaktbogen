# Kontaktbogen

Kundengalerien für Fotografen und Agenturen: hochladen, Link teilen, Favoriten, Kommentare und Freigabe einsammeln.

## Starten

```bash
npm install
npm run build
npm start
```

Entwicklung: `npm run dev`, dann http://localhost:3000.

## Konfiguration (Umgebungsvariablen)

| Variable | Bedeutung | Standard |
| --- | --- | --- |
| `DATA_DIR` | Ordner für Datenbank (SQLite) und Dateien | `./data` |
| `PUBLIC_URL` | Öffentliche Adresse für Kundenlinks, z. B. `https://galerie.example.de` | aus der Anfrage |
| `SESSION_SECRET` | Schlüssel für Zugangs-Cookies | wird in `DATA_DIR/secret` erzeugt |
| `MAX_UPLOAD_MB` | Größte Datei pro Upload | `500` |

Im Produktivbetrieb hinter HTTPS betreiben (Cookies sind dann `Secure`). `DATA_DIR` regelmäßig sichern.
Für Wasserzeichen muss auf dem Server eine Schrift installiert sein (z. B. `fonts-dejavu` oder Inter).

## Aufbau

- `lib/brand.ts`: Produktname, Claim, Kontakt, Preise der Landingpage
- `lib/db.ts`: Schema (SQLite), `lib/storage.ts`: Dateiablage (lokal, austauschbar gegen S3)
- `app/page.tsx`: Landingpage, `app/dashboard`: Bereich für Fotografen, `app/g/[slug]`: Kundengalerie
- `app/api`: Upload, Dateiauslieferung, ZIP, Aktionen der Kunden
