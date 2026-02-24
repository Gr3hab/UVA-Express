import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUVA, UVAPeriodData } from "@/hooks/useUVA";
import { useUVAEngine, type InvoiceForEngine, type UVACalculationResult, type UVAValidationResult, type SubmissionPrepareResult } from "@/hooks/useUVAEngine";
import { useState, useMemo, useCallback } from "react";
import { Calculator, Download, RefreshCw, ChevronLeft, ChevronRight, FileText, AlertTriangle, CheckCircle2, Info, TrendingUp, TrendingDown, Receipt, ShieldCheck, Shield, ClipboardCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubmissionPipeline } from "@/components/SubmissionPipeline";
import { UVAValidationResults } from "@/components/UVAValidationResults";
import Auth from "@/pages/Auth";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const fmt = (v: number | undefined | null) => {
  const num = Number(v) || 0;
  if (num === 0) return "–";
  return `€ ${num.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface KZLineProps {
  kz: string;
  label: string;
  tooltip?: string;
  netto?: number;
  ust?: number;
  isHeader?: boolean;
  isSeparator?: boolean;
  isTotal?: boolean;
  isSubTotal?: boolean;
  showNetto?: boolean;
  showUst?: boolean;
}

const KZLine = ({ kz, label, tooltip, netto, ust, isHeader, isSeparator, isTotal, isSubTotal, showNetto = true, showUst = true }: KZLineProps) => {
  if (isSeparator) {
    return (
      <div className="bg-muted/50 px-5 py-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-2 border-b border-border/40",
      isTotal && "bg-accent/5 border-t-2 border-t-accent/30 py-3",
      isSubTotal && "bg-muted/20 border-t border-t-border",
      isHeader && "bg-muted/30"
    )}>
      {kz ? (
        <span className="flex h-6 min-w-[52px] items-center justify-center rounded bg-muted text-[10px] font-mono font-semibold text-muted-foreground">
          KZ {kz}
        </span>
      ) : (
        <span className="min-w-[52px]" />
      )}
      <span className={cn("flex-1 text-sm", (isTotal || isSubTotal) ? "font-semibold text-card-foreground" : "text-card-foreground")}>
        {label}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="inline h-3 w-3 ml-1 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      {showNetto && (
        <span className="text-sm text-muted-foreground min-w-[100px] text-right">{fmt(netto)}</span>
      )}
      {showUst && (
        <span className={cn(
          "text-sm min-w-[100px] text-right",
          isTotal ? "font-bold text-accent" : isSubTotal ? "font-semibold text-card-foreground" : "font-medium text-card-foreground"
        )}>
          {fmt(ust)}
        </span>
      )}
    </div>
  );
};

const ColumnHeaders = ({ showNetto = true, nettoLabel = "Bemessung", ustLabel = "USt" }: { showNetto?: boolean; nettoLabel?: string; ustLabel?: string }) => (
  <div className="bg-muted/50 px-5 py-1.5">
    <div className="flex items-center gap-3">
      <span className="min-w-[52px]" />
      <span className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase">Bezeichnung</span>
      {showNetto && <span className="min-w-[100px] text-[10px] font-semibold text-muted-foreground text-right uppercase">{nettoLabel}</span>}
      <span className="min-w-[100px] text-[10px] font-semibold text-muted-foreground text-right uppercase">{ustLabel}</span>
    </div>
  </div>
);

const UVA = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { periods, loading, calculating, exporting, calculateUVA, exportXML } = useUVA();
  const engine = useUVAEngine();
  const { toast } = useToast();
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [steuernummer, setSteuernummer] = useState("");
  const [activeTab, setActiveTab] = useState<"formular" | "validierung" | "einreichung">("formular");
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);

  const currentPeriod = useMemo(() => {
    return periods.find(p => p.period_year === selectedYear && p.period_month === selectedMonth + 1);
  }, [periods, selectedYear, selectedMonth]);

  const handlePrev = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  const handleNext = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  // Convert Supabase invoices to engine format
  const fetchInvoicesForEngine = useCallback(async (): Promise<InvoiceForEngine[]> => {
    try {
      const periodStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const nextMonth = selectedMonth + 2 > 12 ? 1 : selectedMonth + 2;
      const nextYear = selectedMonth + 2 > 12 ? selectedYear + 1 : selectedYear;
      const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .gte("invoice_date", periodStart)
        .lt("invoice_date", periodEnd);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number || "",
        invoice_date: inv.invoice_date,
        vendor_name: inv.vendor_name || "",
        net_amount: Number(inv.net_amount) || 0,
        vat_rate: Number(inv.vat_rate) || 20,
        vat_amount: Number(inv.vat_amount) || 0,
        gross_amount: Number(inv.gross_amount) || 0,
        invoice_type: inv.invoice_type || "eingang",
        tax_treatment: inv.tax_treatment || "normal",
        reverse_charge: inv.reverse_charge || false,
        ig_erwerb: inv.ig_erwerb || false,
        ig_lieferung: inv.ig_lieferung || false,
        export_delivery: inv.export_delivery || false,
        currency: inv.currency || "EUR",
        description: inv.description || "",
        rksv_receipt: inv.rksv_receipt || false,
        rksv_kassenid: inv.rksv_kassenid || "",
        rksv_belegnr: inv.rksv_belegnr || "",
        rksv_qr_data: inv.rksv_qr_data || "",
      }));
    } catch (err: any) {
      toast({ title: "Fehler", description: "Rechnungen konnten nicht geladen werden: " + err.message, variant: "destructive" });
      return [];
    }
  }, [selectedYear, selectedMonth, toast]);

  const handleCalculate = async () => {
    try {
      // First try the backend engine
      const invoices = await fetchInvoicesForEngine();
      if (invoices.length > 0) {
        const result = await engine.calculateUVA(
          invoices,
          selectedYear,
          selectedMonth + 1
        );
        if (result) {
          // Also trigger the Supabase-side calculation for persistence
          await calculateUVA(selectedYear, selectedMonth + 1).catch(() => {});
          return;
        }
      }
      // Fallback to Supabase edge function
      const result = await calculateUVA(selectedYear, selectedMonth + 1);
      toast({
        title: "UVA berechnet",
        description: `${result.summary?.invoiceCount || 0} Rechnungen verarbeitet`,
      });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (!steuernummer) {
      toast({ title: "Steuernummer fehlt", description: "Bitte gib deine Steuernummer ein", variant: "destructive" });
      return;
    }
    // Use engine for XML export if we have engine results
    if (engine.calculationResult?.kz_values) {
      await engine.exportXML(
        engine.calculationResult.kz_values,
        steuernummer,
        selectedYear,
        selectedMonth + 1
      );
    } else {
      // Fallback to Supabase
      try {
        await exportXML(selectedYear, selectedMonth + 1, steuernummer);
        toast({ title: "XML exportiert", description: "Datei wurde heruntergeladen – bereit für FinanzOnline" });
      } catch (err: any) {
        toast({ title: "Fehler", description: err.message, variant: "destructive" });
      }
    }
  };

  const handleValidate = async () => {
    if (engine.calculationResult?.kz_values) {
      const invoices = await fetchInvoicesForEngine();
      await engine.validateUVA(
        engine.calculationResult.kz_values,
        selectedYear,
        selectedMonth + 1,
        invoices
      );
      setActiveTab("validierung");
    } else {
      toast({ title: "Zuerst berechnen", description: "Bitte zuerst die UVA über die Engine berechnen", variant: "destructive" });
    }
  };

  const handlePrepareSubmission = async () => {
    if (!steuernummer) {
      toast({ title: "Steuernummer fehlt", description: "Bitte Steuernummer eingeben", variant: "destructive" });
      return;
    }
    if (engine.calculationResult?.kz_values) {
      const invoices = await fetchInvoicesForEngine();
      await engine.prepareSubmission(
        engine.calculationResult.kz_values,
        selectedYear,
        selectedMonth + 1,
        steuernummer,
        invoices
      );
    } else {
      toast({ title: "Zuerst berechnen", description: "Bitte zuerst die UVA berechnen", variant: "destructive" });
    }
  };

  const handlePreviewXML = async () => {
    if (engine.calculationResult?.kz_values && steuernummer) {
      const xml = await engine.exportXMLPreview(
        engine.calculationResult.kz_values,
        steuernummer,
        selectedYear,
        selectedMonth + 1
      );
      setXmlPreview(xml);
    }
  };

  const handleConfirmSubmission = async (reference?: string, note?: string) => {
    await engine.confirmSubmission(selectedYear, selectedMonth + 1, reference, note);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Auth />;

  const p = currentPeriod;
  const n = (v: any) => Number(v) || 0;

  // Calculate section totals for display
  const summeUst = p ? n(p.kz022_ust) + n(p.kz029_ust) + n(p.kz006_ust) + n(p.kz037_ust) + n((p as any).kz052_ust) + n((p as any).kz007_ust) : 0;
  const summeSteuerschuld = p ? n(p.kz056_ust) + n(p.kz057_ust) + n(p.kz048_ust) + n(p.kz044_ust) + n(p.kz032_ust) : 0;
  const summeIGUst = p ? n(p.kz072_ust) + n(p.kz073_ust) + n(p.kz008_ust) + n((p as any).kz088_ust) : 0;
  const gesamtUst = summeUst + summeSteuerschuld + summeIGUst;
  const summeVorsteuer = p ? n(p.kz060_vorsteuer) + n(p.kz061_vorsteuer) + n(p.kz083_vorsteuer) + n(p.kz065_vorsteuer) + n(p.kz066_vorsteuer) + n(p.kz082_vorsteuer) + n(p.kz087_vorsteuer) + n(p.kz089_vorsteuer) + n(p.kz064_vorsteuer) + n(p.kz062_vorsteuer) + n(p.kz063_vorsteuer) + n(p.kz067_vorsteuer) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={signOut} userEmail={user.email} />
      <main className="ml-64 min-h-screen">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Calculator className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Umsatzsteuervoranmeldung</h1>
                <p className="text-sm text-muted-foreground">U 30 · Formular 2026 · gem. § 21 Abs. 1 UStG 1994</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted px-1 py-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 min-w-[140px] text-center">
                  {MONTHS[selectedMonth]} {selectedYear}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Actions bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button onClick={handleCalculate} disabled={calculating} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", calculating && "animate-spin")} />
              {calculating ? "Berechne..." : "UVA berechnen"}
            </Button>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Steuernummer (z.B. 12 345/6789)"
                value={steuernummer}
                onChange={e => setSteuernummer(e.target.value)}
                className="w-60"
              />
              <Button variant="outline" onClick={handleExport} disabled={exporting || !currentPeriod} className="gap-2">
                <Download className="h-4 w-4" />
                {exporting ? "Exportiere..." : "XML für FinanzOnline"}
              </Button>
            </div>
            {currentPeriod && (
              <div className={cn(
                "flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-1.5",
                currentPeriod.status === "calculated" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              )}>
                {currentPeriod.status === "calculated" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {currentPeriod.status === "calculated" ? "Berechnet" : currentPeriod.status === "submitted" ? "Eingereicht" : "Entwurf"}
              </div>
            )}
          </div>

          {!currentPeriod ? (
            <div className="rounded-xl bg-card card-shadow p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">Keine UVA für {MONTHS[selectedMonth]} {selectedYear}</h3>
              <p className="text-sm text-muted-foreground mb-4">Klicke auf "UVA berechnen" um die Voranmeldung aus den erfassten Rechnungen zu erstellen.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-card card-shadow p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gesamt-USt</p>
                    <p className="font-display font-bold text-card-foreground">{fmt(gesamtUst)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-card card-shadow p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <TrendingDown className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vorsteuer</p>
                    <p className="font-display font-bold text-success">{fmt(summeVorsteuer)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-card card-shadow p-4 flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", n(p.kz095_betrag) >= 0 ? "bg-destructive/10" : "bg-success/10")}>
                    <Receipt className={cn("h-5 w-5", n(p.kz095_betrag) >= 0 ? "text-destructive" : "text-success")} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{n(p.kz095_betrag) >= 0 ? "Zahllast" : "Gutschrift"}</p>
                    <p className={cn("font-display font-bold", n(p.kz095_betrag) >= 0 ? "text-destructive" : "text-success")}>
                      {fmt(Math.abs(n(p.kz095_betrag)))}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-card card-shadow p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fällig am</p>
                    <p className="font-display font-bold text-card-foreground">
                      {p.due_date ? new Date(p.due_date).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full U30 Form */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  {/* Abschnitt 1: Steuerpflichtige Umsätze */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">1. Steuerpflichtige Lieferungen, Leistungen und Eigenverbrauch</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Bemessungsgrundlage und darauf entfallende Umsatzsteuer</p>
                    </div>
                    <ColumnHeaders />
                    <KZLine kz="022" label="20 % Normalsteuersatz" tooltip="§ 10 Abs 1 UStG" netto={n(p.kz022_netto)} ust={n(p.kz022_ust)} />
                    <KZLine kz="029" label="10 % ermäßigter Steuersatz" tooltip="§ 10 Abs 2 UStG – Lebensmittel, Bücher, Personenbeförderung" netto={n(p.kz029_netto)} ust={n(p.kz029_ust)} />
                    <KZLine kz="006" label="13 % ermäßigter Steuersatz" tooltip="§ 10 Abs 3 UStG – Blumen, Tierfutter, Kunstgegenstände" netto={n(p.kz006_netto)} ust={n(p.kz006_ust)} />
                    <KZLine kz="037" label="19 % (Jungholz und Mittelberg)" tooltip="Art XIV § 48 Abs 1 UStG" netto={n(p.kz037_netto)} ust={n(p.kz037_ust)} />
                    <KZLine kz="052" label="10 % Zusatzsteuer Tourismusbetriebe" tooltip="§ 12 Abs 15 UStG" netto={n((p as any).kz052_netto)} ust={n((p as any).kz052_ust)} />
                    <KZLine kz="007" label="5 % ermäßigter Steuersatz" tooltip="Historisch, teilweise noch relevant" netto={n((p as any).kz007_netto)} ust={n((p as any).kz007_ust)} />
                    <KZLine kz="" label="Zwischensumme steuerpflichtige Umsätze" ust={summeUst} isSubTotal showNetto={false} />
                  </div>

                  {/* Abschnitt 2: Steuerfreie MIT Vorsteuerabzug */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">2. Steuerfreie Umsätze MIT Vorsteuerabzug</h3>
                    </div>
                    <ColumnHeaders showNetto ustLabel="Bemessung" />
                    <KZLine kz="011" label="Ausfuhrlieferungen" tooltip="§ 6 Abs 1 Z 1 iVm § 7 UStG" netto={n(p.kz011_netto)} showUst={false} />
                    <KZLine kz="012" label="Lohnveredelung" tooltip="§ 6 Abs 1 Z 1 iVm § 8 UStG" netto={n(p.kz012_netto)} showUst={false} />
                    <KZLine kz="015" label="Innergemeinschaftliche Lieferungen" tooltip="Art. 6 Abs 1 BMR" netto={n(p.kz015_netto)} showUst={false} />
                    <KZLine kz="017" label="Dreiecksgeschäfte (Art. 25 Abs 2)" tooltip="Lieferungen nach Art. 25 Abs 2" netto={n(p.kz017_netto)} showUst={false} />
                    <KZLine kz="018" label="Fahrzeuglieferungen (Abnehmer ohne UID)" tooltip="Art. 1 Abs 8, Art. 6 Abs 1 BMR" netto={n(p.kz018_netto)} showUst={false} />
                  </div>

                  {/* Abschnitt 3: Steuerfreie OHNE Vorsteuerabzug */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">3. Steuerfreie Umsätze OHNE Vorsteuerabzug</h3>
                    </div>
                    <ColumnHeaders showNetto ustLabel="Bemessung" />
                    <KZLine kz="019" label="Grundstücksumsätze" tooltip="§ 6 Abs 1 Z 9 lit a UStG" netto={n(p.kz019_netto)} showUst={false} />
                    <KZLine kz="016" label="Kleinunternehmer" tooltip="§ 6 Abs 1 Z 27 UStG" netto={n(p.kz016_netto)} showUst={false} />
                    <KZLine kz="020" label="Übrige steuerfreie Umsätze" netto={n(p.kz020_netto)} showUst={false} />
                  </div>

                  {/* Abschnitt 4: Weiters zu versteuern */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">4. Steuerschuld kraft Rechnungslegung / Reverse Charge</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Nur der Steuerbetrag (keine Bemessungsgrundlage)</p>
                    </div>
                    <ColumnHeaders showNetto={false} ustLabel="Steuer" />
                    <KZLine kz="056" label="§ 11 Abs 12/14, § 16 Abs 2" tooltip="Steuerschuld kraft Rechnungslegung, Art 7 Abs 4" ust={n(p.kz056_ust)} showNetto={false} />
                    <KZLine kz="057" label="§ 19 Abs 1 zweiter Satz, 1c, 1e" tooltip="Reverse Charge – ausländischer Leistender, Art 25 Abs 5" ust={n(p.kz057_ust)} showNetto={false} />
                    <KZLine kz="048" label="§ 19 Abs 1 dritter + vierter Satz" tooltip="Sonstige Reverse-Charge-Fälle" ust={n(p.kz048_ust)} showNetto={false} />
                    <KZLine kz="044" label="§ 19 Abs 1a – Bauleistungen" tooltip="Reverse Charge bei Bauleistungen" ust={n(p.kz044_ust)} showNetto={false} />
                    <KZLine kz="032" label="§ 19 Abs 1b, 1d – Schrott/Sicherungseigentum" tooltip="Reverse Charge bei Schrott, Abfallstoffen, Sicherungseigentum" ust={n(p.kz032_ust)} showNetto={false} />
                    <KZLine kz="" label="Zwischensumme Steuerschuld" ust={summeSteuerschuld} isSubTotal showNetto={false} />
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  {/* Abschnitt 5: IG Erwerbe */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">5. Innergemeinschaftliche Erwerbe</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Art. 1 BMR – Erwerbe aus anderen EU-Mitgliedstaaten</p>
                    </div>
                    <ColumnHeaders />
                    <KZLine kz="070" label="Steuerfrei (Art. 6 Abs 2)" tooltip="Steuerfreie IG Erwerbe" netto={n(p.kz070_netto)} showUst={false} />
                    <KZLine kz="071" label="Neufahrzeuge ohne UID (Art. 1 Abs 8)" tooltip="IG Erwerb neuer Fahrzeuge durch Nicht-Unternehmer" netto={n((p as any).kz071_netto)} showUst={false} />
                    <KZLine kz="072" label="20 % Normalsteuersatz" netto={n(p.kz072_netto)} ust={n(p.kz072_ust)} />
                    <KZLine kz="073" label="10 % ermäßigter Steuersatz" netto={n(p.kz073_netto)} ust={n(p.kz073_ust)} />
                    <KZLine kz="008" label="13 % ermäßigter Steuersatz" netto={n(p.kz008_netto)} ust={n(p.kz008_ust)} />
                    <KZLine kz="088" label="19 % (Jungholz/Mittelberg)" netto={n((p as any).kz088_netto)} ust={n((p as any).kz088_ust)} />
                    <KZLine kz="076" label="Neufahrzeuge 20 %" tooltip="IG Erwerb neuer Fahrzeuge 20%" netto={n((p as any).kz076_netto)} showUst={false} />
                    <KZLine kz="077" label="Neufahrzeuge 10 %" netto={n((p as any).kz077_netto)} showUst={false} />
                    <KZLine kz="" label="Zwischensumme IG Erwerb USt" ust={summeIGUst} isSubTotal showNetto={false} />
                  </div>

                  {/* Abschnitt 6: Vorsteuer */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">6. Abziehbare Vorsteuer</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">§ 12 UStG – Summe aller abziehbaren Vorsteuern</p>
                    </div>
                    <ColumnHeaders showNetto={false} ustLabel="Vorsteuer" />
                    <KZLine kz="060" label="Gesamtbetrag der Vorsteuern" tooltip="§ 12 Abs 1 Z 1 – Vorsteuern aus Rechnungen anderer Unternehmer" ust={n(p.kz060_vorsteuer)} showNetto={false} />
                    <KZLine kz="061" label="Vorsteuern aus IG Erwerben" tooltip="§ 12 Abs 1 Z 2 lit a – Vorsteuerabzug aus IG Erwerben" ust={n(p.kz061_vorsteuer)} showNetto={false} />
                    <KZLine kz="083" label="Vorsteuern § 19 Abs 1, 1c, 1e" tooltip="Vorsteuerabzug aus Reverse-Charge-Leistungen" ust={n(p.kz083_vorsteuer)} showNetto={false} />
                    <KZLine kz="065" label="Einfuhr-USt (§ 12 Abs 1 Z 2 lit b)" tooltip="Vorsteuerabzug aus der Einfuhr" ust={n(p.kz065_vorsteuer)} showNetto={false} />
                    <KZLine kz="066" label="Vorsteuern § 19 Abs 1 dritter/vierter Satz" ust={n(p.kz066_vorsteuer)} showNetto={false} />
                    <KZLine kz="082" label="Vorsteuern § 12 Abs 16" tooltip="Vorsteuerabzug bei Pauschalierung" ust={n(p.kz082_vorsteuer)} showNetto={false} />
                    <KZLine kz="087" label="Vorsteuern § 19 Abs 1a (Bauleistungen)" ust={n(p.kz087_vorsteuer)} showNetto={false} />
                    <KZLine kz="089" label="Vorsteuern § 19 Abs 1b, 1d" tooltip="Schrott, Sicherungseigentum" ust={n(p.kz089_vorsteuer)} showNetto={false} />
                    <KZLine kz="064" label="Vorsteuern Art. 25 Abs 5 (Dreiecksgeschäfte)" ust={n(p.kz064_vorsteuer)} showNetto={false} />
                    <KZLine kz="062" label="EUSt (§ 12 Abs 1 Z 2 lit a)" tooltip="Einfuhrumsatzsteuer direkt am Abgabenkonto" ust={n(p.kz062_vorsteuer)} showNetto={false} />
                    <KZLine kz="063" label="Vorsteuern Reisevorleistungen (§ 23 Abs 8)" ust={n(p.kz063_vorsteuer)} showNetto={false} />
                    <KZLine kz="067" label="Vorsteuerberichtigung (§ 12 Abs 10–12)" tooltip="Berichtigung bei Änderung der Verhältnisse" ust={n(p.kz067_vorsteuer)} showNetto={false} />
                    <KZLine kz="" label="Zwischensumme Vorsteuern" ust={summeVorsteuer} isSubTotal showNetto={false} />
                  </div>

                  {/* Abschnitt 7: Sonstige Berichtigungen */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden">
                    <div className="border-b border-border px-5 py-4">
                      <h3 className="font-display font-semibold text-card-foreground">7. Sonstige Berichtigungen</h3>
                    </div>
                    <ColumnHeaders showNetto={false} ustLabel="Betrag" />
                    <KZLine kz="090" label="Sonstige Berichtigungen" tooltip="z.B. Korrektur früherer Perioden" ust={n(p.kz090_betrag)} showNetto={false} />
                  </div>

                  {/* ERGEBNIS: KZ 095 */}
                  <div className="rounded-xl bg-card card-shadow overflow-hidden border-2 border-accent/30">
                    <div className="px-5 py-5 bg-accent/5">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="flex h-7 min-w-[52px] items-center justify-center rounded bg-accent text-[10px] font-mono font-bold text-accent-foreground">
                          KZ 095
                        </span>
                        <span className="font-display font-bold text-lg text-card-foreground">
                          {n(p.kz095_betrag) >= 0 ? "Vorauszahlung (Zahllast)" : "Überschuss (Gutschrift)"}
                        </span>
                      </div>
                      <div className="bg-background rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Gesamt-USt (Abschnitte 1+4+5)</span>
                          <span className="font-medium">{fmt(gesamtUst)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">− Vorsteuern (Abschnitt 6)</span>
                          <span className="font-medium text-success">− {fmt(summeVorsteuer)}</span>
                        </div>
                        {n(p.kz090_betrag) !== 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">± Berichtigungen (Abschnitt 7)</span>
                            <span className="font-medium">{fmt(n(p.kz090_betrag))}</span>
                          </div>
                        )}
                        <div className="border-t border-border pt-2 flex justify-between">
                          <span className="font-semibold text-card-foreground">
                            = {n(p.kz095_betrag) >= 0 ? "Zahllast" : "Gutschrift"}
                          </span>
                          <span className={cn("font-display text-xl font-bold", n(p.kz095_betrag) >= 0 ? "text-destructive" : "text-success")}>
                            {n(p.kz095_betrag) >= 0 ? "" : "− "}{fmt(Math.abs(n(p.kz095_betrag)))}
                          </span>
                        </div>
                      </div>
                      {p.due_date && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Fällig am: {new Date(p.due_date).toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })} (15. des zweitfolgenden Monats gem. § 21 Abs 1 UStG)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default UVA;
