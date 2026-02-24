import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Impressum = () => {
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

        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Impressum</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Angaben gemäß § 5 ECG / § 25 MedienG</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">UVA Express</strong><br />
              [Vorname Nachname / Firmenname]<br />
              [Straße Hausnummer]<br />
              [PLZ Ort], Österreich
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Kontakt</h2>
            <p className="text-muted-foreground">
              E-Mail: <a href="mailto:kontakt@uvaexpress.at" className="text-accent hover:underline">kontakt@uvaexpress.at</a><br />
              Telefon: [Telefonnummer]
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Unternehmensgegenstand</h2>
            <p className="text-muted-foreground">
              Digitale Dienstleistungen im Bereich der automatisierten Umsatzsteuervoranmeldung (UVA) für
              österreichische Unternehmen und Selbstständige.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">UID-Nummer</h2>
            <p className="text-muted-foreground">[ATU00000000]</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Aufsichtsbehörde</h2>
            <p className="text-muted-foreground">[Zuständige Bezirkshauptmannschaft / Magistrat]</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Haftungsausschluss</h2>
            <p className="text-muted-foreground">
              Die auf dieser Plattform bereitgestellten Berechnungen und Auswertungen dienen ausschließlich
              der Unterstützung bei der Erstellung der Umsatzsteuervoranmeldung. UVA Express ersetzt keine
              steuerliche Beratung. Für die Richtigkeit der übermittelten Daten an das Finanzamt ist der
              Nutzer selbst verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">Streitschlichtung</h2>
            <p className="text-muted-foreground">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Stand: Februar 2026 · Bitte ersetzen Sie die Platzhalter [in eckigen Klammern] durch Ihre tatsächlichen Unternehmensdaten.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Impressum;
