// Produktmarke an einer Stelle. Name, Claim und Kontakt hier anpassen.
export const brand = {
  name: 'Kontaktbogen',
  claim: 'Bilder übergeben. Auswahl zurückbekommen.',
  description:
    'Kundengalerien für Fotografen und Agenturen: Bilder teilen, Favoriten einsammeln, Freigaben dokumentieren.',
  contactEmail: 'hallo@example.com',
  // Beispielwerte. Preise und Leistungen vor dem Start festlegen.
  plans: [
    { name: 'Solo', price: '9 €', unit: 'pro Monat', points: ['1 Nutzer', '100 GB Speicher', 'Unbegrenzt viele Galerien', 'Eigenes Logo und Akzentfarbe'] },
    { name: 'Studio', price: '24 €', unit: 'pro Monat', points: ['3 Nutzer', '500 GB Speicher', 'Wasserzeichen und Passwortschutz', 'Auswahl als Dateiliste exportieren'], featured: true },
    { name: 'Agentur', price: '59 €', unit: 'pro Monat', points: ['10 Nutzer', '2 TB Speicher', 'Freigaben mit Zeitstempel', 'Persönlicher Ansprechpartner'] },
  ],
};
