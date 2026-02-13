import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { year, month } = await req.json();
    if (!year || !month) throw new Error("year and month are required");

    // Get all completed invoices for this period
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const { data: invoices, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .eq("ocr_status", "completed")
      .gte("invoice_date", startDate)
      .lt("invoice_date", endDate);

    if (invError) throw invError;

    // Calculate KZ values from invoices
    // For input invoices (Eingangsrechnungen = Vorsteuer):
    // The invoices we scan are purchase invoices, so they go into Vorsteuer (KZ 060)
    // For now we map by vat_rate to the correct KZ fields
    let kz060_vorsteuer = 0; // Gesamtbetrag Vorsteuern
    let kz022_netto = 0, kz022_ust = 0; // 20%
    let kz029_netto = 0, kz029_ust = 0; // 10%
    let kz006_netto = 0, kz006_ust = 0; // 13%

    for (const inv of (invoices || [])) {
      const net = Number(inv.net_amount) || 0;
      const vat = Number(inv.vat_amount) || 0;
      const rate = Number(inv.vat_rate) || 0;

      // Input invoices → Vorsteuer
      kz060_vorsteuer += vat;

      // Also track by rate for reporting
      if (rate === 20) {
        kz022_netto += net;
        kz022_ust += vat;
      } else if (rate === 10) {
        kz029_netto += net;
        kz029_ust += vat;
      } else if (rate === 13) {
        kz006_netto += net;
        kz006_ust += vat;
      }
    }

    // Calculate Zahllast = Umsatzsteuer - Vorsteuer
    // For now, since we only have input invoices (purchases), Zahllast is negative (Gutschrift)
    // When output invoices (sales) are added, this will include KZ 000/001 USt
    const totalUst = 0; // No sales invoices yet
    const zahllast = totalUst - kz060_vorsteuer;
    const kz095 = zahllast; // positive = Zahllast, negative = Gutschrift

    // Due date: 15th of second month after period
    const dueMonth = month + 2 > 12 ? (month + 2 - 12) : month + 2;
    const dueYear = month + 2 > 12 ? year + 1 : year;
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, "0")}-15`;

    // Upsert UVA period
    const uvaData = {
      user_id: user.id,
      period_year: year,
      period_month: month,
      status: "calculated",
      // Steuerpflichtige Umsätze (from purchase invoices for tracking)
      kz022_netto, kz022_ust,
      kz029_netto, kz029_ust,
      kz006_netto, kz006_ust,
      // Legacy fields (keep backward compat)
      kz000_netto: kz022_netto, kz000_ust: kz022_ust,
      kz001_netto: kz029_netto, kz001_ust: kz029_ust,
      kz021_netto: 0, kz021_ust: 0,
      // Vorsteuer
      kz060_vorsteuer,
      // Zahllast
      zahllast,
      kz095_betrag: kz095,
      due_date: dueDate,
    };

    // Check if period exists
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
      invoiceCount: invoices?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Calculate UVA error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
