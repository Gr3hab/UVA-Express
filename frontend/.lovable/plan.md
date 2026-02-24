

# Go-Live Checkliste -- UVA Express

## Status Quo

Die App hat bereits:
- Authentifizierung (Login/Registrierung)
- Rechnungs-Upload mit KI-OCR
- UVA-Berechnung (U30 Formular 2026, alle KZ)
- XML-Export fur FinanzOnline
- Impressum und Datenschutz (mit Platzhaltern)
- RLS-Security auf allen Tabellen
- ErrorBoundary gegen White Screens

Das "Bad Gateway"-Problem scheint aktuell behoben -- die Login-Seite ladt korrekt.

---

## Was fehlt noch bis zum Go-Live?

### 1. Impressum und Datenschutz -- Platzhalter ersetzen (RECHTLICH VERPFLICHTEND)

Die Seiten existieren, aber enthalten noch `[Platzhalter]`. 

**Daten die ich von dir brauche:**
- Firmenname oder Vor-/Nachname
- Adresse (Strasse, PLZ, Ort)
- Telefonnummer
- E-Mail-Adresse fur Kontakt
- E-Mail-Adresse fur Datenschutz (kann dieselbe sein)
- UID-Nummer (ATU...)
- Zustandige Behorde (Bezirkshauptmannschaft/Magistrat)
- Firmenbuchnummer (falls vorhanden)

### 2. Stripe Payment Integration -- Freemium + Pro Modell

**Geplantes Modell:**
- **Free:** 5 Rechnungen/Monat, UVA-Berechnung
- **Pro (EUR 9,90/Monat):** Unbegrenzte Rechnungen + XML-Export

**Was gebaut wird:**
- Stripe Checkout Integration (Abo-Verwaltung)
- Paywall-Logik: Rechnungszahler pro User/Monat prufen
- Pro-Badge und Upgrade-Hinweise in der UI
- Abo-Verwaltungsseite (kundigen, Plan andern)
- Webhook-Verarbeitung fur Zahlungsstatus

**Daten die ich von dir brauche:**
- Bestatigung, dass du ein Stripe-Konto hast (oder erstellen willst)
- Stripe Secret Key (wird sicher als Secret gespeichert)

### 3. Rechnungs-Detailansicht und Korrektur

**Was gebaut wird:**
- Klickbare Rechnungen in der Liste offnen eine Detailseite
- Alle OCR-Felder bearbeitbar: Rechnungstyp, steuerliche Behandlung, Betrage, Lieferant, Datum
- Validierung gegen die 9 Pflichtangaben (Paragraph 11 UStG)
- Anderungen direkt in der Datenbank speichern
- Status-Anzeige: "OCR gepruft" vs "Manuell korrigiert"

**Keine Daten von dir notig** -- kann sofort gebaut werden.

### 4. Professionelle Landing Page und Onboarding

**Was gebaut wird:**
- Offentliche Landing Page (vor dem Login)
- Hero-Section mit Wertversprechen
- Feature-Ubersicht (OCR, UVA, XML-Export)
- Pricing-Tabelle (Free vs Pro)
- Trust-Elemente und FAQ
- CTA: "Jetzt kostenlos starten"
- Onboarding-Flow nach Registrierung

**Daten die ich von dir brauche:**
- Logo (Bilddatei, falls vorhanden)
- Gewunschter Marketing-Text / Slogan (oder soll ich einen vorschlagen?)
- Testimonials (falls vorhanden)
- Spezielle Branding-Vorgaben (Farben, Schriftarten)?

### 5. Weitere wichtige Punkte fur Production-Readiness

| Punkt | Status | Aufwand |
|-------|--------|---------|
| E-Mail-Bestatigung bei Registrierung | Bereits aktiv | -- |
| Passwort-Zurucksetzen Flow | Fehlt | Klein |
| Responsive Design (Mobile) | Fehlt | Mittel |
| Leaked Password Protection | Manuell aktivieren | Minimal |
| Rechnungs-Loschfunktion | Fehlt | Klein |
| Fehlerhafte OCR-Erkennung melden | Fehlt | Klein |

---

## Zusammenfassung: Was ich jetzt von dir brauche

1. **Unternehmensdaten** fur Impressum (Name, Adresse, UID, Telefon, Behorde)
2. **Stripe-Konto** -- hast du eins, oder soll ich dir erklaren wie man eins erstellt?
3. **Logo** -- hast du eins? (optional, kann auch ohne starten)
4. **Marketing-Text** -- soll ich Vorschlage machen, oder hast du eigene Texte?

---

## Vorgeschlagene Reihenfolge

1. Rechnungs-Detailansicht (braucht keine Daten von dir, sofort machbar)
2. Impressum-Platzhalter ersetzen (sobald du mir die Daten gibst)
3. Stripe Payment Integration (sobald du den API Key bereitstellst)
4. Landing Page (kann parallel gebaut werden)
5. Kleinere Features (Passwort-Reset, Mobile, etc.)

---

## Technische Details

### Stripe Integration
- Neue Edge Function: `create-checkout-session` und `stripe-webhook`
- Neue DB-Tabelle: `subscriptions` (user_id, stripe_customer_id, plan, status)
- RLS-Policies fur Subscriptions
- Frontend: Paywall-Check in UploadZone und XML-Export

### Rechnungs-Detailansicht
- Neue Seite: `/invoice/:id`
- Route in App.tsx hinzufugen
- Formular mit allen editierbaren Feldern
- Supabase UPDATE auf invoices-Tabelle

### Landing Page
- Neue offentliche Route `/` (Landing) vs `/dashboard` (eingeloggt)
- Routing-Logik anpassen: Eingeloggte User direkt zum Dashboard

