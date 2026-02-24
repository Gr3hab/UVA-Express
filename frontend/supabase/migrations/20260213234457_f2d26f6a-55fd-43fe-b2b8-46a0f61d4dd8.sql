
-- Add all missing Kennzahlen from official U30 2026 form to uva_periods
ALTER TABLE public.uva_periods
  -- Steuerfreie Umsätze MIT Vorsteuerabzug
  ADD COLUMN IF NOT EXISTS kz011_netto numeric DEFAULT 0,  -- Ausfuhrlieferungen
  ADD COLUMN IF NOT EXISTS kz012_netto numeric DEFAULT 0,  -- Lohnveredelungen
  ADD COLUMN IF NOT EXISTS kz015_netto numeric DEFAULT 0,  -- Seeschifffahrt, Luftfahrt, etc.
  ADD COLUMN IF NOT EXISTS kz017_netto numeric DEFAULT 0,  -- IG Lieferungen
  ADD COLUMN IF NOT EXISTS kz018_netto numeric DEFAULT 0,  -- IG Lieferungen neue Fahrzeuge
  -- Steuerfreie Umsätze OHNE Vorsteuerabzug
  ADD COLUMN IF NOT EXISTS kz019_netto numeric DEFAULT 0,  -- Grundstücksumsätze
  ADD COLUMN IF NOT EXISTS kz016_netto numeric DEFAULT 0,  -- Kleinunternehmer
  ADD COLUMN IF NOT EXISTS kz020_netto numeric DEFAULT 0,  -- Übrige steuerfreie
  -- Steuerpflichtige Umsätze (Bemessungsgrundlage + USt)
  ADD COLUMN IF NOT EXISTS kz022_netto numeric DEFAULT 0,  -- 20% Normalsteuersatz
  ADD COLUMN IF NOT EXISTS kz022_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz029_netto numeric DEFAULT 0,  -- 10% ermäßigt
  ADD COLUMN IF NOT EXISTS kz029_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz006_ust numeric DEFAULT 0,    -- 13% ermäßigt (kz006_netto exists)
  ADD COLUMN IF NOT EXISTS kz037_netto numeric DEFAULT 0,  -- 19% Jungholz/Mittelberg
  ADD COLUMN IF NOT EXISTS kz037_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz052_netto numeric DEFAULT 0,  -- 10% Zusatzsteuer pauschaliert
  ADD COLUMN IF NOT EXISTS kz052_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz007_netto numeric DEFAULT 0,  -- 7% forstwirtschaftliche Betriebe
  ADD COLUMN IF NOT EXISTS kz007_ust numeric DEFAULT 0,
  -- Weiters zu versteuern (Steuerschuld)
  ADD COLUMN IF NOT EXISTS kz056_ust numeric DEFAULT 0,    -- §11 Abs 12/14
  ADD COLUMN IF NOT EXISTS kz057_ust numeric DEFAULT 0,    -- §19 Abs 1
  ADD COLUMN IF NOT EXISTS kz048_ust numeric DEFAULT 0,    -- Bauleistungen
  ADD COLUMN IF NOT EXISTS kz044_ust numeric DEFAULT 0,    -- Sicherungseigentum
  ADD COLUMN IF NOT EXISTS kz032_ust numeric DEFAULT 0,    -- Schrott/Abfallstoffe
  -- IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz070_netto numeric DEFAULT 0,  -- Gesamtbetrag IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz071_netto numeric DEFAULT 0,  -- steuerfrei Art 6 Abs 2
  ADD COLUMN IF NOT EXISTS kz072_netto numeric DEFAULT 0,  -- 20% IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz072_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz073_netto numeric DEFAULT 0,  -- 10% IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz073_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz008_netto numeric DEFAULT 0,  -- 13% IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz008_ust numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz088_netto numeric DEFAULT 0,  -- 19% IG Erwerbe
  ADD COLUMN IF NOT EXISTS kz088_ust numeric DEFAULT 0,
  -- Nicht zu versteuernde Erwerbe
  ADD COLUMN IF NOT EXISTS kz076_netto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kz077_netto numeric DEFAULT 0,
  -- Vorsteuer (detailliert)
  ADD COLUMN IF NOT EXISTS kz061_vorsteuer numeric DEFAULT 0,  -- EUSt
  ADD COLUMN IF NOT EXISTS kz083_vorsteuer numeric DEFAULT 0,  -- EUSt auf Abgabenkonto
  ADD COLUMN IF NOT EXISTS kz065_vorsteuer numeric DEFAULT 0,  -- IG Erwerb Vorsteuer
  ADD COLUMN IF NOT EXISTS kz066_vorsteuer numeric DEFAULT 0,  -- §19 Abs 1
  ADD COLUMN IF NOT EXISTS kz082_vorsteuer numeric DEFAULT 0,  -- Bauleistungen
  ADD COLUMN IF NOT EXISTS kz087_vorsteuer numeric DEFAULT 0,  -- Sicherungseigentum
  ADD COLUMN IF NOT EXISTS kz089_vorsteuer numeric DEFAULT 0,  -- Schrott
  ADD COLUMN IF NOT EXISTS kz064_vorsteuer numeric DEFAULT 0,  -- IG neue Fahrzeuge
  ADD COLUMN IF NOT EXISTS kz062_vorsteuer numeric DEFAULT 0,  -- Nicht abzugsfähig
  ADD COLUMN IF NOT EXISTS kz063_vorsteuer numeric DEFAULT 0,  -- Berichtigung §12
  ADD COLUMN IF NOT EXISTS kz067_vorsteuer numeric DEFAULT 0,  -- Berichtigung §16
  -- Sonstige Berichtigungen
  ADD COLUMN IF NOT EXISTS kz090_betrag numeric DEFAULT 0,
  -- Zahllast/Überschuss (kz095)
  ADD COLUMN IF NOT EXISTS kz095_betrag numeric DEFAULT 0;
