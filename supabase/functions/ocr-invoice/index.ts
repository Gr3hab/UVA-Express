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

    // Get user from token
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { invoiceId, fileUrl } = await req.json();
    if (!invoiceId || !fileUrl) throw new Error("invoiceId and fileUrl are required");

    // Update status to processing
    await supabase.from("invoices").update({ ocr_status: "processing" }).eq("id", invoiceId);

    // Download the file to get base64
    const fileResponse = await fetch(fileUrl, {
      headers: { Authorization: authHeader, apikey: publishableKey },
    });
    if (!fileResponse.ok) throw new Error("Failed to download file");

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Determine mime type from URL
    const ext = fileUrl.split(".").pop()?.toLowerCase() || "jpg";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf", webp: "image/webp" };
    const mimeType = mimeMap[ext] || "image/jpeg";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Call AI to extract invoice data
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für österreichische Rechnungen und das UStG (Umsatzsteuergesetz).
Extrahiere aus dem Rechnungsbild/-dokument folgende Informationen:
- vendor_name: Name des Lieferanten/Rechnungsstellers
- invoice_number: Rechnungsnummer
- invoice_date: Rechnungsdatum (Format: YYYY-MM-DD)
- net_amount: Nettobetrag in Euro (nur Zahl, z.B. 100.00)
- vat_rate: USt-Satz in Prozent (z.B. 20, 10, 13)
- vat_amount: USt-Betrag in Euro (nur Zahl)
- gross_amount: Bruttobetrag in Euro (nur Zahl)
- description: Kurzbeschreibung der Leistung/Ware
- vat_category: USt-Kategorie nach österreichischem Recht ("20%", "10%", "13%", "0%")

Österreichische USt-Sätze:
- 20% Normalsteuersatz (Standard)
- 10% ermäßigter Satz (Lebensmittel, Bücher, Personenbeförderung, Wohnraumvermietung)
- 13% ermäßigter Satz (Blumen, Tierfutter, Kunstgegenstände, Filmvorführungen)
- 0% steuerbefreit (Ausfuhrlieferungen, innergemeinschaftliche Lieferungen)

Prüfe die Rechnung auf Pflichtangaben nach § 11 UStG:
1. Name und Anschrift des Lieferanten
2. Name und Anschrift des Empfängers
3. Menge und Bezeichnung der Gegenstände/Leistungen
4. Tag/Zeitraum der Lieferung/Leistung
5. Entgelt und USt-Betrag
6. USt-Satz
7. UID-Nummer des Lieferanten
8. Fortlaufende Rechnungsnummer
9. Ausstellungsdatum

Gib ein confidence-Feld (0-100) an, wie sicher du dir bei der Extraktion bist.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Bitte extrahiere die Rechnungsdaten aus diesem Dokument." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice",
              description: "Extract structured invoice data from an Austrian invoice",
              parameters: {
                type: "object",
                properties: {
                  vendor_name: { type: "string" },
                  invoice_number: { type: "string" },
                  invoice_date: { type: "string", description: "YYYY-MM-DD format" },
                  net_amount: { type: "number" },
                  vat_rate: { type: "number" },
                  vat_amount: { type: "number" },
                  gross_amount: { type: "number" },
                  description: { type: "string" },
                  vat_category: { type: "string", enum: ["20%", "10%", "13%", "0%"] },
                  confidence: { type: "number", description: "0-100 confidence score" },
                  missing_requirements: { type: "array", items: { type: "string" }, description: "Missing mandatory fields per §11 UStG" },
                },
                required: ["vendor_name", "net_amount", "vat_rate", "vat_amount", "gross_amount", "vat_category", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        await supabase.from("invoices").update({ ocr_status: "error" }).eq("id", invoiceId);
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuche es in einer Minute erneut." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("invoices").update({ ocr_status: "error" }).eq("id", invoiceId);
        return new Response(JSON.stringify({ error: "AI-Guthaben aufgebraucht." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted:", extracted);

    // Update invoice with extracted data
    const { error: updateError } = await supabase.from("invoices").update({
      vendor_name: extracted.vendor_name,
      invoice_number: extracted.invoice_number || null,
      invoice_date: extracted.invoice_date || null,
      net_amount: extracted.net_amount,
      vat_rate: extracted.vat_rate,
      vat_amount: extracted.vat_amount,
      gross_amount: extracted.gross_amount,
      description: extracted.description || null,
      vat_category: extracted.vat_category,
      ocr_confidence: extracted.confidence,
      ocr_status: "completed",
    }).eq("id", invoiceId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update invoice");
    }

    return new Response(JSON.stringify({
      success: true,
      data: extracted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
