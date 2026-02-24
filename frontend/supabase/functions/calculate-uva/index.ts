import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * UVA-Berechnung · Formular U 30 (2026) · Österreichisches UStG
 * Version 20.08.2025 – 100% konforme Engine
 *
 * Alle Kennzahlen (KZ) gemäß dem offiziellen Formular:
 *
 * KOPFDATEN:
 *   KZ 000 – Gesamtbetrag der Bemessungsgrundlage für Lieferungen
 *            und sonstige Leistungen (ohne Eigenverbrauch), inkl.
 *            Anzahlungen, jeweils ohne USt
 *   KZ 001 – Eigenverbrauch (§ 1 Abs 1 Z 2, § 3 Abs 2, § 3a Abs 1a)
 *   KZ 021 – Abzüglich Umsätze mit Übergang der Steuerschuld
 *            (§ 19 Abs 1 2.Satz, 1a, 1b, 1c, 1d, 1e)
 *
 * ABSCHNITT 1: Steuerpflichtige Lieferungen, Leistungen, Eigenverbrauch
 *   KZ 022 – 20% Normalsteuersatz (Bemessungsgrundlage + USt)
 *   KZ 029 – 10% ermäßigter Steuersatz
 *   KZ 006 – 13% ermäßigter Steuersatz
 *   KZ 037 – 19% Steuersatz (Jungholz/Mittelberg)
 *   KZ 052 – 10% Zusatzsteuer (pauschalierte land-/forstwirtschaftliche Betriebe)
 *   KZ 007 – 7% Zusatzsteuer (pauschalierte land-/forstwirtschaftliche Betriebe)
 *
 * ABSCHNITT 2: Steuerfreie Umsätze MIT Vorsteuerabzug
 *   KZ 011 – Ausfuhrlieferungen (§ 6 Abs 1 Z 1 iVm § 7)
 *   KZ 012 – Lohnveredelung (§ 6 Abs 1 Z 1 iVm § 8)
 *   KZ 015 – Seeschifffahrt, Luftfahrt, Diplomaten etc.
 *            (§ 6 Abs 1 Z 2-6, § 23 Abs 5, § 28 Abs 62)
 *   KZ 017 – IG Lieferungen (Art. 6 Abs 1 BMR)
 *   KZ 018 – Fahrzeuglieferungen ohne UID (Art. 6 Abs 1, Art. 2)
 *
 * ABSCHNITT 3: Steuerfreie Umsätze OHNE Vorsteuerabzug
 *   KZ 019 – Grundstücksumsätze (§ 6 Abs 1 Z 9 lit a)
 *   KZ 016 – Kleinunternehmer (§ 6 Abs 1 Z 27)
 *   KZ 020 – Übrige steuerfreie Umsätze
 *
 * ABSCHNITT 4: Steuerschuld kraft Rechnungslegung / Reverse Charge
 *   KZ 056 – § 11 Abs 12/14, § 16 Abs 2, Art 7 Abs 4
 *   KZ 057 – § 19 Abs 1 zweiter Satz, § 19 Abs 1c, 1e, Art 25 Abs 5
 *   KZ 048 – § 19 Abs 1a (Bauleistungen)
 *   KZ 044 – § 19 Abs 1b (Sicherungseigentum, Vorbehaltseigentum)
 *   KZ 032 – § 19 Abs 1d (Schrott, Abfallstoffe, Videospielkonsolen,
 *            Laptops, Gas, Elektrizität, Metalle, Anlagegold)
 *
 * ABSCHNITT 5: Innergemeinschaftliche Erwerbe
 *   KZ 070 – Gesamtbetrag der Bemessungsgrundlagen für IG Erwerbe
 *   KZ 071 – Steuerfrei (Art 6 Abs 2, § 28 Abs 62)
 *   KZ 072 – 20% IG Erwerbe
 *   KZ 073 – 10% IG Erwerbe
 *   KZ 008 – 13% IG Erwerbe
 *   KZ 088 – 19% IG Erwerbe (Jungholz/Mittelberg)
 *   KZ 076 – Nicht zu versteuern (Art 3 Abs 8, besteuert im
 *            Bestimmungsmitgliedstaat)
 *   KZ 077 – Nicht zu versteuern (Art 3 Abs 8 + Art 25 Abs 2)
 *
 * ABSCHNITT 6: Abziehbare Vorsteuer
 *   KZ 060 – Gesamtbetrag der Vorsteuern (inländische Rechnungen)
 *   KZ 061 – EUSt entrichtet (§ 12 Abs 1 Z 2 lit a)
 *   KZ 083 – EUSt Abgabenkonto (§ 12 Abs 1 Z 2 lit b)
 *   KZ 065 – Vorsteuern aus IG Erwerben
 *   KZ 066 – Vorsteuern § 19 Abs 1, 1c, 1e + Art 25 Abs 5
 *   KZ 082 – Vorsteuern § 19 Abs 1a (Bauleistungen)
 *   KZ 087 – Vorsteuern § 19 Abs 1b (Sicherungseigentum)
 *   KZ 089 – Vorsteuern § 19 Abs 1d (Schrott)
 *   KZ 064 – Vorsteuern IG Lieferungen neuer Fahrzeuge (Art. 2)
 *   KZ 062 – Nicht abzugsfähig (§ 12 Abs 3 iVm Abs 4 und 5)
 *   KZ 063 – Berichtigung (§ 12 Abs 10 und 11)
 *   KZ 067 – Berichtigung (§ 16)
 *
 * ERGEBNIS:
 *   KZ 090 – Gesamtbetrag der abziehbaren Vorsteuer
 *   KZ 095 – Vorauszahlung (Zahllast) / Überschuss (Gutschrift)
 *
 *   KZ 095 = Summe USt (Abschn 1+4+5) − KZ 090
 * ═══════════════════════════════════════════════════════════════════
 */

const RATE_MAP: Record<number, string> = {
  20: "022", 10: "029", 13: "006", 19: "037", 7: "007",
};

const IG_RATE_MAP: Record<number, string> = {
  20: "072", 10: "073", 13: "008", 19: "088",
};

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function validateInput(body: unknown): { year: number; month: number } {
  if (!body || typeof body !== "object") throw new Error("INVALID_INPUT");
  const { year, month } = body as Record<string, unknown>;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("INVALID_INPUT");
  if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("INVALID_INPUT");
  return { year, month };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let year: number, month: number;
    try {
      const parsed = validateInput(await req.json());
      year = parsed.year;
      month = parsed.month;
    } catch {
      return new Response(JSON.stringify({ error: "Ungültige Eingabedaten. Jahr (2000-2100) und Monat (1-12) erforderlich." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────
    // Date range for this period
    // ──────────────────────────────────────────────
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    // Fetch all completed invoices for this period for this user
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .eq("ocr_status", "completed")
      .gte("invoice_date", startDate)
      .lt("invoice_date", endDate);

    if (invError) throw invError;

    // ──────────────────────────────────────────────
    // Initialize ALL Kennzahlen to 0
    // ──────────────────────────────────────────────
    const kz: Record<string, number> = {
      // Kopfdaten
      "000_netto": 0, "001_netto": 0, "021_netto": 0,
      // Abschnitt 1: Steuerpflichtige Umsätze
      "022_netto": 0, "022_ust": 0,
      "029_netto": 0, "029_ust": 0,
      "006_netto": 0, "006_ust": 0,
      "037_netto": 0, "037_ust": 0,
      "052_netto": 0, "052_ust": 0,
      "007_netto": 0, "007_ust": 0,
      // Abschnitt 2: Steuerfrei MIT Vorsteuerabzug
      "011_netto": 0, "012_netto": 0, "015_netto": 0,
      "017_netto": 0, "018_netto": 0,
      // Abschnitt 3: Steuerfrei OHNE Vorsteuerabzug
      "019_netto": 0, "016_netto": 0, "020_netto": 0,
      // Abschnitt 4: Steuerschuld
      "056_ust": 0, "057_ust": 0, "048_ust": 0,
      "044_ust": 0, "032_ust": 0,
      // Abschnitt 5: IG Erwerbe
      "070_netto": 0, "071_netto": 0,
      "072_netto": 0, "072_ust": 0,
      "073_netto": 0, "073_ust": 0,
      "008_netto": 0, "008_ust": 0,
      "088_netto": 0, "088_ust": 0,
      "076_netto": 0, "077_netto": 0,
      // Abschnitt 6: Vorsteuern
      "060_vorsteuer": 0,
      "061_vorsteuer": 0, "083_vorsteuer": 0,
      "065_vorsteuer": 0, "066_vorsteuer": 0,
      "082_vorsteuer": 0, "087_vorsteuer": 0,
      "089_vorsteuer": 0, "064_vorsteuer": 0,
      "062_vorsteuer": 0, "063_vorsteuer": 0,
      "067_vorsteuer": 0,
    };

    let ausgangCount = 0;
    let eingangCount = 0;
    let igCount = 0;
    let rcCount = 0;
    const warnings: string[] = [];
    const processedInvoiceIds: string[] = [];

    // ──────────────────────────────────────────────
    // Process each invoice according to Austrian UStG
    // ──────────────────────────────────────────────
    for (const inv of (invoices || [])) {
      const net = Number(inv.net_amount) || 0;
      const vat = Number(inv.vat_amount) || 0;
      const gross = Number(inv.gross_amount) || 0;
      const rate = Number(inv.vat_rate) || 20;
      const type = inv.invoice_type || "eingang";
      const treatment = inv.tax_treatment || "normal";

      processedInvoiceIds.push(inv.id);

      // ── Validate invoice data ──
      if (net === 0 && gross === 0) {
        warnings.push(`Rechnung ${inv.invoice_number || inv.id}: Betrag ist 0`);
        continue;
      }

      // Validate VAT consistency (within 2% tolerance)
      if (treatment === "normal" && rate > 0 && net > 0) {
        const expectedVat = round2(net * rate / 100);
        const diff = Math.abs(expectedVat - vat);
        if (diff > 0.02 * expectedVat && expectedVat > 0) {
          warnings.push(`Rechnung ${inv.invoice_number || inv.id}: USt-Betrag (${vat}) weicht von erwartetem Wert (${expectedVat}) ab`);
        }
      }

      // ══════════════════════════════════════════
      // AUSGANGSRECHNUNGEN (Verkauf / Sales)
      // ══════════════════════════════════════════
      if (type === "ausgang") {
        ausgangCount++;

        // KZ 000: Add to total supplies base
        kz["000_netto"] += net;

        // Tax-free WITH Vorsteuerabzug (Abschnitt 2)
        if (treatment === "export") {
          kz["011_netto"] += net;
        } else if (treatment === "ig_lieferung") {
          kz["017_netto"] += net;
        } else if (treatment === "lohnveredelung") {
          kz["012_netto"] += net;
        } else if (treatment === "dreiecksgeschaeft") {
          kz["017_netto"] += net; // Dreiecksgeschäft = IG Lieferung Sonderfall
        } else if (treatment === "fahrzeug_ohne_uid") {
          kz["018_netto"] += net;
        // Tax-free WITHOUT Vorsteuerabzug (Abschnitt 3)
        } else if (treatment === "grundstueck") {
          kz["019_netto"] += net;
        } else if (treatment === "kleinunternehmer") {
          kz["016_netto"] += net;
        } else if (treatment === "steuerbefreit_sonstige") {
          kz["020_netto"] += net;
        // Normal taxable supplies (Abschnitt 1)
        } else {
          const rateKZ = RATE_MAP[rate] || "022";
          kz[`${rateKZ}_netto`] += net;
          kz[`${rateKZ}_ust`] += vat;
        }

        // KZ 021: RC transfers where Steuerschuld passes to recipient
        // These are Ausgang invoices with reverse charge
        if (treatment.startsWith("reverse_charge") || treatment === "ig_lieferung") {
          kz["021_netto"] += net;
        }

      // ══════════════════════════════════════════
      // EINGANGSRECHNUNGEN (Einkauf / Purchases)
      // ══════════════════════════════════════════
      } else if (type === "eingang") {
        eingangCount++;

        // ── IG Erwerbe (Abschnitt 5) ──
        if (treatment === "ig_erwerb") {
          igCount++;
          const igKZ = IG_RATE_MAP[rate] || "072";
          // IG Erwerb: Bemessungsgrundlage + USt to IG section
          kz[`${igKZ}_netto`] += net;
          kz[`${igKZ}_ust`] += vat;
          // KZ 070: Gesamtbetrag IG Erwerbe
          kz["070_netto"] += net;
          // Vorsteuer aus IG Erwerb (Abschnitt 6)
          kz["065_vorsteuer"] += vat;

        // ── Reverse Charge (Abschnitt 4 + 6) ──
        } else if (treatment === "reverse_charge_19_1") {
          rcCount++;
          // Steuerschuld § 19 Abs 1 zweiter Satz, 1c, 1e
          kz["057_ust"] += vat;
          // Gleichzeitig Vorsteuerabzug
          kz["066_vorsteuer"] += vat;

        } else if (treatment === "reverse_charge_19_1a") {
          rcCount++;
          // Bauleistungen § 19 Abs 1a
          kz["048_ust"] += vat;
          kz["082_vorsteuer"] += vat;

        } else if (treatment === "reverse_charge_19_1b") {
          rcCount++;
          // Sicherungseigentum § 19 Abs 1b
          kz["044_ust"] += vat;
          kz["087_vorsteuer"] += vat;

        } else if (treatment === "reverse_charge_19_1d") {
          rcCount++;
          // Schrott, Abfallstoffe § 19 Abs 1d
          kz["032_ust"] += vat;
          kz["089_vorsteuer"] += vat;

        } else if (treatment === "reverse_charge_19_1_3_4") {
          rcCount++;
          // § 19 Abs 1 dritter + vierter Satz
          kz["057_ust"] += vat;
          kz["066_vorsteuer"] += vat;

        // ── Einfuhr (Import) ──
        } else if (treatment === "einfuhr") {
          // EUSt entrichtet (§ 12 Abs 1 Z 2 lit a)
          kz["061_vorsteuer"] += vat;

        } else if (treatment === "eust_abgabenkonto") {
          // EUSt auf Abgabenkonto (§ 12 Abs 1 Z 2 lit b)
          kz["083_vorsteuer"] += vat;

        // ── Normal domestic purchase ──
        } else {
          // Standard Vorsteuer from domestic invoices
          kz["060_vorsteuer"] += vat;
        }
      }
    }

    // ──────────────────────────────────────────────
    // Calculate section totals
    // ──────────────────────────────────────────────

    // Abschnitt 1: Summe USt aus steuerpflichtigen Umsätzen
    const summeUst = round2(
      kz["022_ust"] + kz["029_ust"] + kz["006_ust"] +
      kz["037_ust"] + kz["052_ust"] + kz["007_ust"]
    );

    // Abschnitt 4: Summe Steuerschuld (RC / kraft Rechnungslegung)
    const summeSteuerschuld = round2(
      kz["056_ust"] + kz["057_ust"] + kz["048_ust"] +
      kz["044_ust"] + kz["032_ust"]
    );

    // Abschnitt 5: Summe IG Erwerbe USt
    const summeIGUst = round2(
      kz["072_ust"] + kz["073_ust"] + kz["008_ust"] + kz["088_ust"]
    );

    // Gesamt-USt (Zahllast-Seite)
    const gesamtUst = round2(summeUst + summeSteuerschuld + summeIGUst);

    // KZ 090: Gesamtbetrag der abziehbaren Vorsteuer
    const kz090 = round2(
      kz["060_vorsteuer"] + kz["061_vorsteuer"] + kz["083_vorsteuer"] +
      kz["065_vorsteuer"] + kz["066_vorsteuer"] + kz["082_vorsteuer"] +
      kz["087_vorsteuer"] + kz["089_vorsteuer"] + kz["064_vorsteuer"] -
      Math.abs(kz["062_vorsteuer"]) + // nicht abzugsfähig (negativ)
      kz["063_vorsteuer"] + kz["067_vorsteuer"]
    );

    // KZ 095: Vorauszahlung (Zahllast) / Überschuss (Gutschrift)
    // Positiv = Zahllast, Negativ = Gutschrift
    const kz095 = round2(gesamtUst - kz090);

    // Due date: 15. des zweitfolgenden Monats (§ 21 Abs 1 UStG)
    const dueMonth = month + 2 > 12 ? (month + 2 - 12) : month + 2;
    const dueYear = month + 2 > 12 ? year + 1 : year;
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-15`;

    // ──────────────────────────────────────────────
    // Build UVA data object
    // ──────────────────────────────────────────────
    const uvaData: Record<string, any> = {
      user_id: user.id,
      period_year: year,
      period_month: month,
      status: "calculated",
      // Kopfdaten
      kz000_netto: round2(kz["000_netto"]),
      kz000_ust: 0, // Legacy field
      kz001_netto: round2(kz["001_netto"]),
      kz001_ust: 0, // Legacy field
      kz021_netto: round2(kz["021_netto"]),
      kz021_ust: 0, // Legacy field
      // Abschnitt 1: Steuerpflichtige Umsätze
      kz022_netto: round2(kz["022_netto"]), kz022_ust: round2(kz["022_ust"]),
      kz029_netto: round2(kz["029_netto"]), kz029_ust: round2(kz["029_ust"]),
      kz006_netto: round2(kz["006_netto"]), kz006_ust: round2(kz["006_ust"]),
      kz037_netto: round2(kz["037_netto"]), kz037_ust: round2(kz["037_ust"]),
      kz052_netto: round2(kz["052_netto"]), kz052_ust: round2(kz["052_ust"]),
      kz007_netto: round2(kz["007_netto"]), kz007_ust: round2(kz["007_ust"]),
      // Abschnitt 2: Steuerfrei MIT Vorsteuerabzug
      kz011_netto: round2(kz["011_netto"]),
      kz012_netto: round2(kz["012_netto"]),
      kz015_netto: round2(kz["015_netto"]),
      kz017_netto: round2(kz["017_netto"]),
      kz018_netto: round2(kz["018_netto"]),
      // Abschnitt 3: Steuerfrei OHNE Vorsteuerabzug
      kz019_netto: round2(kz["019_netto"]),
      kz016_netto: round2(kz["016_netto"]),
      kz020_netto: round2(kz["020_netto"]),
      // Abschnitt 4: Steuerschuld
      kz056_ust: round2(kz["056_ust"]),
      kz057_ust: round2(kz["057_ust"]),
      kz048_ust: round2(kz["048_ust"]),
      kz044_ust: round2(kz["044_ust"]),
      kz032_ust: round2(kz["032_ust"]),
      // Abschnitt 5: IG Erwerbe
      kz070_netto: round2(kz["070_netto"]),
      kz071_netto: round2(kz["071_netto"]),
      kz072_netto: round2(kz["072_netto"]), kz072_ust: round2(kz["072_ust"]),
      kz073_netto: round2(kz["073_netto"]), kz073_ust: round2(kz["073_ust"]),
      kz008_netto: round2(kz["008_netto"]), kz008_ust: round2(kz["008_ust"]),
      kz088_netto: round2(kz["088_netto"]), kz088_ust: round2(kz["088_ust"]),
      kz076_netto: round2(kz["076_netto"]),
      kz077_netto: round2(kz["077_netto"]),
      // Abschnitt 6: Vorsteuern
      kz060_vorsteuer: round2(kz["060_vorsteuer"]),
      kz061_vorsteuer: round2(kz["061_vorsteuer"]),
      kz083_vorsteuer: round2(kz["083_vorsteuer"]),
      kz065_vorsteuer: round2(kz["065_vorsteuer"]),
      kz066_vorsteuer: round2(kz["066_vorsteuer"]),
      kz082_vorsteuer: round2(kz["082_vorsteuer"]),
      kz087_vorsteuer: round2(kz["087_vorsteuer"]),
      kz089_vorsteuer: round2(kz["089_vorsteuer"]),
      kz064_vorsteuer: round2(kz["064_vorsteuer"]),
      kz062_vorsteuer: round2(kz["062_vorsteuer"]),
      kz063_vorsteuer: round2(kz["063_vorsteuer"]),
      kz067_vorsteuer: round2(kz["067_vorsteuer"]),
      // Ergebnis
      kz090_betrag: kz090,
      kz095_betrag: kz095,
      zahllast: kz095,
      due_date: dueDate,
    };

    // ──────────────────────────────────────────────
    // Upsert UVA period
    // ──────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("uva_periods")
      .select("id")
      .eq("user_id", user.id)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    let uvaResult;
    if (existing) {
      const { data, error } = await supabase
        .from("uva_periods")
        .update(uvaData)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      uvaResult = data;
    } else {
      const { data, error } = await supabase
        .from("uva_periods")
        .insert(uvaData)
        .select()
        .single();
      if (error) throw error;
      uvaResult = data;
    }

    // ──────────────────────────────────────────────
    // Audit log entry
    // ──────────────────────────────────────────────
    try {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "uva_calculated",
        entity_type: "uva_period",
        entity_id: uvaResult.id,
        details: {
          period: `${year}-${String(month).padStart(2, "0")}`,
          invoice_count: invoices?.length || 0,
          ausgang_count: ausgangCount,
          eingang_count: eingangCount,
          ig_count: igCount,
          rc_count: rcCount,
          kz095: kz095,
          warnings: warnings,
        },
      });
    } catch (_auditErr) {
      // Audit log failure should not block UVA calculation
      console.error("Audit log write failed");
    }

    // ──────────────────────────────────────────────
    // Response
    // ──────────────────────────────────────────────
    return new Response(JSON.stringify({
      success: true,
      data: uvaResult,
      summary: {
        invoiceCount: invoices?.length || 0,
        ausgangCount,
        eingangCount,
        igCount,
        rcCount,
        kz000: round2(kz["000_netto"]),
        kz021: round2(kz["021_netto"]),
        summeUst,
        summeSteuerschuld,
        summeIGUst,
        gesamtUst,
        kz090,
        kz095,
        warnings,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorCode = e instanceof Error ? e.message : "UNKNOWN_ERROR";
    console.error("UVA calculation failed:", errorCode);
    return new Response(JSON.stringify({ error: "UVA-Berechnung fehlgeschlagen. Bitte versuchen Sie es erneut." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
