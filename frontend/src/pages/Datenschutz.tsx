import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Datenschutz = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </button>

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">1. Verantwortlicher</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">[Vorname Nachname / Firmenname]</strong><br />
              [Adresse]<br />
              E-Mail: <a href="mailto:datenschutz@uvaexpress.at" className="text-accent hover:underline">datenschutz@uvaexpress.at</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">2. Erhobene Daten</h2>
            <p className="text-muted-foreground">Wir verarbeiten folgende personenbezogene Daten:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Kontodaten:</strong> E-Mail-Adresse und verschlüsseltes Passwort bei der Registrierung</li>
              <li><strong className="text-foreground">Rechnungsdaten:</strong> Hochgeladene Rechnungsbilder und daraus extrahierte Daten (Beträge, Rechnungsnummern, Lieferantennamen)</li>
              <li><strong className="text-foreground">UVA-Daten:</strong> Berechnete Kennzahlen für die Umsatzsteuervoranmeldung</li>
              <li><strong className="text-foreground">Technische Daten:</strong> IP-Adresse, Browsertyp, Zeitstempel der Zugriffe</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">3. Zweck der Verarbeitung</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Bereitstellung und Verbesserung unseres Dienstes (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Automatisierte Texterkennung (OCR) auf hochgeladenen Rechnungen</li>
              <li>Berechnung der UVA-Kennzahlen gemäß österreichischem Steuerrecht</li>
              <li>Erzeugung von XML-Dateien für FinanzOnline</li>
              <li>Kommunikation mit Nutzern (Art. 6 Abs. 1 lit. f DSGVO)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">4. Speicherdauer</h2>
            <p className="text-muted-foreground">
              Ihre Daten werden so lange gespeichert, wie Ihr Konto aktiv ist. Nach Löschung des Kontos
              werden alle personenbezogenen Daten innerhalb von 30 Tagen gelöscht. Die gesetzlichen
              Aufbewahrungsfristen (§ 132 BAO – 7 Jahre) bleiben unberührt.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">5. Auftragsverarbeiter</h2>
            <p className="text-muted-foreground">Wir setzen folgende Dienstleister ein:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Hosting & Datenbank:</strong> Supabase Inc. (USA) – Standardvertragsklauseln gemäß Art. 46 DSGVO</li>
              <li><strong className="text-foreground">OCR-Verarbeitung:</strong> Verarbeitung über sichere Serververbindungen</li>
              <li><strong className="text-foreground">Zahlungsabwicklung:</strong> Stripe Inc. (USA) – Standardvertragsklauseln gemäß Art. 46 DSGVO</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">6. Ihre Rechte</h2>
            <p className="text-muted-foreground">Sie haben gemäß DSGVO folgende Rechte:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Auskunft</strong> (Art. 15 DSGVO)</li>
              <li><strong className="text-foreground">Berichtigung</strong> (Art. 16 DSGVO)</li>
              <li><strong className="text-foreground">Löschung</strong> (Art. 17 DSGVO)</li>
              <li><strong className="text-foreground">Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
              <li><strong className="text-foreground">Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
              <li><strong className="text-foreground">Widerspruch</strong> (Art. 21 DSGVO)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Kontaktieren Sie uns unter{" "}
              <a href="mailto:datenschutz@uvaexpress.at" className="text-accent hover:underline">datenschutz@uvaexpress.at</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">7. Beschwerderecht</h2>
            <p className="text-muted-foreground">
              Sie haben das Recht, eine Beschwerde bei der österreichischen Datenschutzbehörde einzureichen:{" "}
              <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                www.dsb.gv.at
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">8. Cookies</h2>
            <p className="text-muted-foreground">
              UVA Express verwendet ausschließlich technisch notwendige Cookies für die Authentifizierung
              und Sitzungsverwaltung. Es werden keine Tracking- oder Marketing-Cookies eingesetzt.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Stand: Februar 2026 · Bitte ersetzen Sie die Platzhalter [in eckigen Klammern] durch Ihre tatsächlichen Daten.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Datenschutz;
