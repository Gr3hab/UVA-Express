import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * UVA-Berechnung nach Formular U 30 (2026) – Österreichisches UStG
 * 
 * Alle Kennzahlen (KZ) gemäß dem offiziellen Formular:
 * 
 * ABSCHNITT 1: Steuerpflichtige Lieferungen, sonstige Leistungen und Eigenverbrauch
 *   KZ 022 – 20% Normalsteuersatz (Bemessungsgrundlage + USt)
 *   KZ 029 – 10% ermäßigter Steuersatz  
 *   KZ 006 – 13% ermäßigter Steuersatz
 *   KZ 037 – 19% Steuersatz (Jungholz/Mittelberg)
 *   KZ 052 – 10% Zusatzsteuer (§ 12 Abs 15 – Tourismusbetriebe)
 *   KZ 007 – 5% ermäßigter Steuersatz (historisch, tlw. noch relevant)
 *
 * ABSCHNITT 2: Steuerfreie Umsätze MIT Vorsteuerabzug
 *   KZ 011 – Ausfuhrlieferungen (§ 6 Abs 1 Z 1 iVm § 7)
 *   KZ 012 – Lohnveredelung (§ 6 Abs 1 Z 1 iVm § 8)
 *   KZ 015 – IG Lieferungen (Art. 6 Abs 1 BMR)
 *   KZ 017 – Lieferungen gem Art. 25 Abs 2 (Dreiecksgeschäft)
 *   KZ 018 – Fahrzeuglieferungen an Abnehmer ohne UID
 *
 * ABSCHNITT 3: Steuerfreie Umsätze OHNE Vorsteuerabzug
 *   KZ 019 – Grundstücksumsätze (§ 6 Abs 1 Z 9 lit a)
 *   KZ 016 – Kleinunternehmer (§ 6 Abs 1 Z 27)
 *   KZ 020 – Übrige steuerfreie Umsätze
 *
 * ABSCHNITT 4: Weiters zu versteuernde Beträge (nur Steuer)
 *   KZ 056 – Steuerschuld § 11 Abs 12/14, § 16 Abs 2
 *   KZ 057 – Steuerschuld § 19 Abs 1 zweiter Satz, Abs 1c, 1e
 *   KZ 048 – Steuerschuld § 19 Abs 1 dritter + vierter Satz
 *   KZ 044 – Steuerschuld § 19 Abs 1a (Bauleistungen)
 *   KZ 032 – Steuerschuld § 19 Abs 1b, 1d (Schrott, Sicherungseigentum)
 *
 * ABSCHNITT 5: Innergemeinschaftliche Erwerbe
 *   KZ 070 – Steuerfrei (Art 6 Abs 2)
 *   KZ 071 – Neufahrzeuge ohne UID (Art 1 Abs 8)
 *   KZ 072 – IG Erwerbe 20% (Bemessungsgrundlage + USt)
 *   KZ 073 – IG Erwerbe 10%
 *   KZ 008 – IG Erwerbe 13%
 *   KZ 088 – IG Erwerbe 19%
 *   KZ 076 – Neufahrzeuge 20%
 *   KZ 077 – Neufahrzeuge 10%
 *
 * ABSCHNITT 6: Abziehbare Vorsteuer
 *   KZ 060 – Gesamtbetrag der Vorsteuern (ohne IG/RC Vorsteuern)
 *   KZ 061 – Vorsteuern IG Erwerbe
 *   KZ 083 – Vorsteuern § 19 Abs 1 zweiter Satz, 1c, 1e
 *   KZ 065 – Einfuhr-USt (§ 12 Abs 1 Z 2 lit b)
 *   KZ 066 – Vorsteuern § 19 Abs 1 dritter + vierter Satz
 *   KZ 082 – Vorsteuern § 12 Abs 16
 *   KZ 087 – Vorsteuern § 19 Abs 1a (Bauleistungen)
 *   KZ 089 – Vorsteuern § 19 Abs 1b, 1d
 *   KZ 064 – Vorsteuern gem Art. 25 Abs 5 (Dreiecksgeschäfte)
 *   KZ 062 – EUSt (§ 12 Abs 1 Z 2 lit a)
 *   KZ 063 – Vorsteuern Reisevorleistungen (§ 23 Abs 8)
 *   KZ 067 – Vorsteuerberichtigung (§ 12 Abs 10, 11, 12)
 *
 * ABSCHNITT 7: Sonstige Berichtigungen
 *   KZ 090 – Sonstige Berichtigungen
 *
 * ERGEBNIS:
 *   KZ 095 – Vorauszahlung (Zahllast) / Überschuss (Gutschrift)
 *   Zahllast = Summe USt (Abschnitte 1+4+5) − Summe Vorsteuer (Abschnitt 6+7)
 */

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

    // Date range for this period
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    // Fetch all completed invoices for this period
    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .eq("ocr_status", "completed")
      .gte("invoice_date", startDate)
      .lt("invoice_date", endDate);

    if (invError) throw invError;

    // ──────────────────────────────────────────────
    // Initialize all KZ fields to 0
    // ──────────────────────────────────────────────
    const kz: Record<string, number> = {
      "022_netto": 0, "022_ust": 0,
      "029_netto": 0, "029_ust": 0,
      "006_netto": 0, "006_ust": 0,
      "037_netto": 0, "037_ust": 0,
      "052_netto": 0, "052_ust": 0,
      "007_netto": 0, "007_ust": 0,
      "011_netto": 0, "012_netto": 0, "015_netto": 0,
      "017_netto": 0, "018_netto": 0,
      "019_netto": 0, "016_netto": 0, "020_netto": 0,
      "056_ust": 0, "057_ust": 0, "048_ust": 0,
      "044_ust": 0, "032_ust": 0,
      "070_netto": 0, "071_netto": 0,
      "072_netto": 0, "072_ust": 0,
      "073_netto": 0, "073_ust": 0,
      "008_netto": 0, "008_ust": 0,
      "088_netto": 0, "088_ust": 0,
      "076_netto": 0, "077_netto": 0,
      "060_vorsteuer": 0,
      "061_vorsteuer": 0, "083_vorsteuer": 0,
      "065_vorsteuer": 0, "066_vorsteuer": 0,
      "082_vorsteuer": 0, "087_vorsteuer": 0,
      "089_vorsteuer": 0, "064_vorsteuer": 0,
      "062_vorsteuer": 0, "063_vorsteuer": 0,
      "067_vorsteuer": 0,
      "090_betrag": 0,
    };

    const rateToKZ = (rate: number): string => {
      if (rate === 20) return "022";
      if (rate === 10) return "029";
      if (rate === 13) return "006";
      if (rate === 19) return "037";
      if (rate === 5) return "007";
      return "022";
    };

    const igRateToKZ = (rate: number): string => {
      if (rate === 20) return "072";
      if (rate === 10) return "073";
      if (rate === 13) return "008";
      if (rate === 19) return "088";
      return "072";
    };

    let ausgangCount = 0;
    let eingangCount = 0;
    let igCount = 0;

    for (const inv of (invoices || [])) {
      const net = Number(inv.net_amount) || 0;
      const vat = Number(inv.vat_amount) || 0;
      const rate = Number(inv.vat_rate) || 20;
      const type = inv.invoice_type || "eingang";
      const treatment = inv.tax_treatment || "normal";

      if (type === "ausgang") {
        ausgangCount++;
        if (treatment === "export") {
          kz["011_netto"] += net;
        } else if (treatment === "ig_lieferung") {
          kz["015_netto"] += net;
        } else if (treatment === "lohnveredelung") {
          kz["012_netto"] += net;
        } else if (treatment === "dreiecksgeschaeft") {
          kz["017_netto"] += net;
        } else if (treatment === "fahrzeug_ohne_uid") {
          kz["018_netto"] += net;
        } else if (treatment === "grundstueck") {
          kz["019_netto"] += net;
        } else if (treatment === "kleinunternehmer") {
          kz["016_netto"] += net;
        } else if (treatment === "steuerbefreit_sonstige") {
          kz["020_netto"] += net;
        } else {
          const rateKZ = rateToKZ(rate);
          kz[`${rateKZ}_netto`] += net;
          kz[`${rateKZ}_ust`] += vat;
        }
      } else if (type === "eingang") {
        eingangCount++;
        if (treatment === "ig_erwerb") {
          igCount++;
          const igKZ = igRateToKZ(rate);
          kz[`${igKZ}_netto`] += net;
          kz[`${igKZ}_ust`] += vat;
          kz["070_netto"] += net;
          kz["061_vorsteuer"] += vat;
        } else if (treatment === "reverse_charge_19_1") {
          kz["057_ust"] += vat;
          kz["083_vorsteuer"] += vat;
        } else if (treatment === "reverse_charge_19_1a") {
          kz["044_ust"] += vat;
          kz["087_vorsteuer"] += vat;
        } else if (treatment === "reverse_charge_19_1b") {
          kz["032_ust"] += vat;
          kz["089_vorsteuer"] += vat;
        } else if (treatment === "reverse_charge_19_1d") {
          kz["032_ust"] += vat;
          kz["089_vorsteuer"] += vat;
        } else if (treatment === "reverse_charge_19_1_3_4") {
          kz["048_ust"] += vat;
          kz["066_vorsteuer"] += vat;
        } else if (treatment === "einfuhr") {
          kz["065_vorsteuer"] += vat;
        } else if (treatment === "eust_abgabenkonto") {
          kz["062_vorsteuer"] += vat;
        } else {
          kz["060_vorsteuer"] += vat;
        }
      }
    }

    const summeUst = kz["022_ust"] + kz["029_ust"] + kz["006_ust"] + kz["037_ust"]
      + kz["052_ust"] + kz["007_ust"];
    const summeSteuerschuld = kz["056_ust"] + kz["057_ust"] + kz["048_ust"]
      + kz["044_ust"] + kz["032_ust"];
    const summeIGUst = kz["072_ust"] + kz["073_ust"] + kz["008_ust"] + kz["088_ust"];
    const gesamtUst = summeUst + summeSteuerschuld + summeIGUst;
    const summeVorsteuer = kz["060_vorsteuer"] + kz["061_vorsteuer"] + kz["083_vorsteuer"]
      + kz["065_vorsteuer"] + kz["066_vorsteuer"] + kz["082_vorsteuer"]
      + kz["087_vorsteuer"] + kz["089_vorsteuer"] + kz["064_vorsteuer"]
      + kz["062_vorsteuer"] + kz["063_vorsteuer"] + kz["067_vorsteuer"];
    const sonstigeBerichtigungen = kz["090_betrag"];
    const zahllast = gesamtUst - summeVorsteuer + sonstigeBerichtigungen;
    const kz095 = zahllast;

    const dueMonth = month + 2 > 12 ? (month + 2 - 12) : month + 2;
    const dueYear = month + 2 > 12 ? year + 1 : year;
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-15`;

    const uvaData: Record<string, any> = {
      user_id: user.id,
      period_year: year,
      period_month: month,
      status: "calculated",
      kz022_netto: kz["022_netto"], kz022_ust: kz["022_ust"],
      kz029_netto: kz["029_netto"], kz029_ust: kz["029_ust"],
      kz006_netto: kz["006_netto"], kz006_ust: kz["006_ust"],
      kz037_netto: kz["037_netto"], kz037_ust: kz["037_ust"],
      kz052_netto: kz["052_netto"], kz052_ust: kz["052_ust"],
      kz007_netto: kz["007_netto"], kz007_ust: kz["007_ust"],
      kz011_netto: kz["011_netto"], kz012_netto: kz["012_netto"],
      kz015_netto: kz["015_netto"], kz017_netto: kz["017_netto"],
      kz018_netto: kz["018_netto"],
      kz019_netto: kz["019_netto"], kz016_netto: kz["016_netto"],
      kz020_netto: kz["020_netto"],
      kz056_ust: kz["056_ust"], kz057_ust: kz["057_ust"],
      kz048_ust: kz["048_ust"], kz044_ust: kz["044_ust"],
      kz032_ust: kz["032_ust"],
      kz070_netto: kz["070_netto"], kz071_netto: kz["071_netto"],
      kz072_netto: kz["072_netto"], kz072_ust: kz["072_ust"],
      kz073_netto: kz["073_netto"], kz073_ust: kz["073_ust"],
      kz008_netto: kz["008_netto"], kz008_ust: kz["008_ust"],
      kz088_netto: kz["088_netto"], kz088_ust: kz["088_ust"],
      kz076_netto: kz["076_netto"], kz077_netto: kz["077_netto"],
      kz060_vorsteuer: kz["060_vorsteuer"],
      kz061_vorsteuer: kz["061_vorsteuer"], kz083_vorsteuer: kz["083_vorsteuer"],
      kz065_vorsteuer: kz["065_vorsteuer"], kz066_vorsteuer: kz["066_vorsteuer"],
      kz082_vorsteuer: kz["082_vorsteuer"], kz087_vorsteuer: kz["087_vorsteuer"],
      kz089_vorsteuer: kz["089_vorsteuer"], kz064_vorsteuer: kz["064_vorsteuer"],
      kz062_vorsteuer: kz["062_vorsteuer"], kz063_vorsteuer: kz["063_vorsteuer"],
      kz067_vorsteuer: kz["067_vorsteuer"],
      kz090_betrag: kz["090_betrag"],
      kz095_betrag: kz095,
      zahllast: zahllast,
      due_date: dueDate,
      kz000_netto: kz["022_netto"], kz000_ust: kz["022_ust"],
      kz001_netto: kz["029_netto"], kz001_ust: kz["029_ust"],
      kz021_netto: 0, kz021_ust: 0,
    };

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

    return new Response(JSON.stringify({
      success: true,
      data: uvaResult,
      summary: {
        invoiceCount: invoices?.length || 0,
        ausgangCount,
        eingangCount,
        igCount,
        summeUst: Math.round(summeUst * 100) / 100,
        summeSteuerschuld: Math.round(summeSteuerschuld * 100) / 100,
        summeIGUst: Math.round(summeIGUst * 100) / 100,
        gesamtUst: Math.round(gesamtUst * 100) / 100,
        summeVorsteuer: Math.round(summeVorsteuer * 100) / 100,
        zahllast: Math.round(zahllast * 100) / 100,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Calculate UVA error:", e);
    return new Response(JSON.stringify({ error: "UVA-Berechnung fehlgeschlagen. Bitte versuchen Sie es erneut." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
