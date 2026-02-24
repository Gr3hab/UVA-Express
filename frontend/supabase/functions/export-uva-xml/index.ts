import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function validateExportInput(body: unknown): { year: number; month: number; steuernummer: string } {
  if (!body || typeof body !== "object") throw new Error("INVALID_INPUT");
  const { year, month, steuernummer } = body as Record<string, unknown>;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("INVALID_INPUT");
  if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("INVALID_INPUT");
  let cleanSteuernummer = "000/0000";
  if (steuernummer !== undefined && steuernummer !== null) {
    if (typeof steuernummer !== "string" || steuernummer.length > 20) throw new Error("INVALID_INPUT");
    cleanSteuernummer = steuernummer.replace(/[^a-zA-Z0-9\/\-]/g, "").substring(0, 20) || "000/0000";
  }
  return { year, month, steuernummer: cleanSteuernummer };
}

function fmtAmt(val: number | null): string {
  return (val || 0).toFixed(2);
}

// XML-escape for safe values
function xmlEsc(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build FinanzOnline-compliant XML for UVA (Umsatzsteuervoranmeldung)
 * Based on the official BMF XML schema for electronic submission
 * Formular U 30 (2026)
 */
function buildUvaXml(uva: any, steuernummer: string): string {
  const year = uva.period_year;
  const month = String(uva.period_month).padStart(2, "0");
  const stnr = xmlEsc(steuernummer);

  return `<?xml version="1.0" encoding="UTF-8"?>
<ERKLAERUNGENPAKET>
  <INFO_DATEN>
    <ART>UVA</ART>
    <FASESSION_ID>0</FASESSION_ID>
    <STEUERNUMMER>${stnr}</STEUERNUMMER>
    <ZEITRAUM>${year}-${month}</ZEITRAUM>
    <ERSTELLUNGSDATUM>${new Date().toISOString().split("T")[0]}</ERSTELLUNGSDATUM>
  </INFO_DATEN>
  <ERKLAERUNG art="U30">
    <SATZNR>1</SATZNR>
    <ALLGEMEINE_DATEN>
      <ANBRINGEN>UVA</ANBRINGEN>
      <ZEITRAUM>
        <JAHR>${year}</JAHR>
        <MONAT>${month}</MONAT>
      </ZEITRAUM>
    </ALLGEMEINE_DATEN>
    <KENNZAHLEN>
      <!-- Kopfdaten -->
      <KZ000>${fmtAmt(uva.kz000_netto)}</KZ000>
      <KZ001>${fmtAmt(uva.kz001_netto)}</KZ001>
      <KZ021>${fmtAmt(uva.kz021_netto)}</KZ021>
      <!-- Steuerpflichtige Lieferungen und Leistungen -->
      <KZ022_BMGL>${fmtAmt(uva.kz022_netto)}</KZ022_BMGL>
      <KZ022_STEUER>${fmtAmt(uva.kz022_ust)}</KZ022_STEUER>
      <KZ029_BMGL>${fmtAmt(uva.kz029_netto)}</KZ029_BMGL>
      <KZ029_STEUER>${fmtAmt(uva.kz029_ust)}</KZ029_STEUER>
      <KZ006_BMGL>${fmtAmt(uva.kz006_netto)}</KZ006_BMGL>
      <KZ006_STEUER>${fmtAmt(uva.kz006_ust)}</KZ006_STEUER>
      <KZ037_BMGL>${fmtAmt(uva.kz037_netto)}</KZ037_BMGL>
      <KZ037_STEUER>${fmtAmt(uva.kz037_ust)}</KZ037_STEUER>
      <KZ052_BMGL>${fmtAmt(uva.kz052_netto)}</KZ052_BMGL>
      <KZ052_STEUER>${fmtAmt(uva.kz052_ust)}</KZ052_STEUER>
      <KZ007_BMGL>${fmtAmt(uva.kz007_netto)}</KZ007_BMGL>
      <KZ007_STEUER>${fmtAmt(uva.kz007_ust)}</KZ007_STEUER>
      <!-- Steuerfreie Umsaetze MIT Vorsteuerabzug -->
      <KZ011>${fmtAmt(uva.kz011_netto)}</KZ011>
      <KZ012>${fmtAmt(uva.kz012_netto)}</KZ012>
      <KZ015>${fmtAmt(uva.kz015_netto)}</KZ015>
      <KZ017>${fmtAmt(uva.kz017_netto)}</KZ017>
      <KZ018>${fmtAmt(uva.kz018_netto)}</KZ018>
      <!-- Steuerfreie Umsaetze OHNE Vorsteuerabzug -->
      <KZ019>${fmtAmt(uva.kz019_netto)}</KZ019>
      <KZ016>${fmtAmt(uva.kz016_netto)}</KZ016>
      <KZ020>${fmtAmt(uva.kz020_netto)}</KZ020>
      <!-- Steuerschuld kraft Rechnungslegung / Reverse Charge -->
      <KZ056>${fmtAmt(uva.kz056_ust)}</KZ056>
      <KZ057>${fmtAmt(uva.kz057_ust)}</KZ057>
      <KZ048>${fmtAmt(uva.kz048_ust)}</KZ048>
      <KZ044>${fmtAmt(uva.kz044_ust)}</KZ044>
      <KZ032>${fmtAmt(uva.kz032_ust)}</KZ032>
      <!-- Innergemeinschaftliche Erwerbe -->
      <KZ070>${fmtAmt(uva.kz070_netto)}</KZ070>
      <KZ071>${fmtAmt(uva.kz071_netto)}</KZ071>
      <KZ072_BMGL>${fmtAmt(uva.kz072_netto)}</KZ072_BMGL>
      <KZ072_STEUER>${fmtAmt(uva.kz072_ust)}</KZ072_STEUER>
      <KZ073_BMGL>${fmtAmt(uva.kz073_netto)}</KZ073_BMGL>
      <KZ073_STEUER>${fmtAmt(uva.kz073_ust)}</KZ073_STEUER>
      <KZ008_BMGL>${fmtAmt(uva.kz008_netto)}</KZ008_BMGL>
      <KZ008_STEUER>${fmtAmt(uva.kz008_ust)}</KZ008_STEUER>
      <KZ088_BMGL>${fmtAmt(uva.kz088_netto)}</KZ088_BMGL>
      <KZ088_STEUER>${fmtAmt(uva.kz088_ust)}</KZ088_STEUER>
      <!-- Nicht zu versteuernde Erwerbe -->
      <KZ076>${fmtAmt(uva.kz076_netto)}</KZ076>
      <KZ077>${fmtAmt(uva.kz077_netto)}</KZ077>
      <!-- Abziehbare Vorsteuer -->
      <KZ060>${fmtAmt(uva.kz060_vorsteuer)}</KZ060>
      <KZ061>${fmtAmt(uva.kz061_vorsteuer)}</KZ061>
      <KZ083>${fmtAmt(uva.kz083_vorsteuer)}</KZ083>
      <KZ065>${fmtAmt(uva.kz065_vorsteuer)}</KZ065>
      <KZ066>${fmtAmt(uva.kz066_vorsteuer)}</KZ066>
      <KZ082>${fmtAmt(uva.kz082_vorsteuer)}</KZ082>
      <KZ087>${fmtAmt(uva.kz087_vorsteuer)}</KZ087>
      <KZ089>${fmtAmt(uva.kz089_vorsteuer)}</KZ089>
      <KZ064>${fmtAmt(uva.kz064_vorsteuer)}</KZ064>
      <KZ062>${fmtAmt(uva.kz062_vorsteuer)}</KZ062>
      <KZ063>${fmtAmt(uva.kz063_vorsteuer)}</KZ063>
      <KZ067>${fmtAmt(uva.kz067_vorsteuer)}</KZ067>
      <!-- Gesamtbetrag der abziehbaren Vorsteuer -->
      <KZ090>${fmtAmt(uva.kz090_betrag)}</KZ090>
      <!-- Zahllast / Gutschrift -->
      <KZ095>${fmtAmt(uva.kz095_betrag)}</KZ095>
    </KENNZAHLEN>
  </ERKLAERUNG>
</ERKLAERUNGENPAKET>`;
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

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let year: number, month: number, steuernummer: string;
    try {
      const parsed = validateExportInput(await req.json());
      year = parsed.year;
      month = parsed.month;
      steuernummer = parsed.steuernummer;
    } catch {
      return new Response(JSON.stringify({ error: "Ungültige Eingabedaten" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: uva, error: uvaError } = await supabase
      .from("uva_periods")
      .select("*")
      .eq("user_id", user.id)
      .eq("period_year", year)
      .eq("period_month", month)
      .maybeSingle();

    if (uvaError) throw uvaError;
    if (!uva) {
      return new Response(JSON.stringify({ error: "Keine UVA für diesen Zeitraum gefunden. Bitte zuerst berechnen." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xml = buildUvaXml(uva, steuernummer);

    // Audit log for export
    try {
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action: "uva_xml_exported",
        entity_type: "uva_period",
        entity_id: uva.id,
        details: {
          period: `${year}-${String(month).padStart(2, "0")}`,
          steuernummer_provided: steuernummer !== "000/0000",
        },
      });
    } catch (_auditErr) {
      // Non-blocking
    }

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="UVA_${year}_${String(month).padStart(2, "0")}.xml"`,
      },
    });
  } catch (e) {
    const errorCode = e instanceof Error ? e.message : "UNKNOWN_ERROR";
    console.error("UVA XML export failed:", errorCode);
    return new Response(JSON.stringify({ error: "XML-Export fehlgeschlagen. Bitte versuchen Sie es erneut." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
