import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUVA, UVAPeriodData } from "@/hooks/useUVA";
import { useState, useMemo } from "react";
import { Calculator, Download, RefreshCw, ChevronLeft, ChevronRight, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Auth from "@/pages/Auth";

const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

interface KZLineProps {
  kz: string;
  label: string;
  netto?: number;
  ust?: number;
  isHeader?: boolean;
  isSeparator?: boolean;
  isTotal?: boolean;
  showNetto?: boolean;
}

const KZLine = ({ kz, label, netto, ust, isHeader, isSeparator, isTotal, showNetto = true }: KZLineProps) => {
  if (isSeparator) {
    return (
      <div className="bg-muted/50 px-5 py-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    );
  }

  const fmt = (v: number | undefined) => {
    if (v === undefined || v === 0) return "–";
    return `€ ${v.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-2.5 border-b border-border/50",
      isTotal && "bg-accent/5 border-t-2 border-t-accent/30",
      isHeader && "bg-muted/30"
    )}>
      {kz && (
        <span className="flex h-6 min-w-[52px] items-center justify-center rounded bg-muted text-[10px] font-mono font-semibold text-muted-foreground">
          KZ {kz}
        </span>
      )}
      <span className={cn("flex-1 text-sm", isTotal ? "font-semibold text-card-foreground" : "text-card-foreground")}>
        {label}
      </span>
      {showNetto && (
        <span className="text-sm text-muted-foreground min-w-[100px] text-right">{fmt(netto)}</span>
      )}
      <span className={cn(
        "text-sm min-w-[100px] text-right",
        isTotal ? "font-bold text-accent" : "font-medium text-card-foreground"
      )}>
        {fmt(ust)}
      </span>
    </div>
  );
};

const UVA = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { periods, loading, calculating, exporting, calculateUVA, exportXML } = useUVA();
  const { toast } = useToast();
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed display, 1-indexed API
  const [steuernummer, setSteuernummer] = useState("");

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

  const handleCalculate = async () => {
    try {
      const result = await calculateUVA(selectedYear, selectedMonth + 1);
      toast({
        title: "UVA berechnet",
        description: `${result.invoiceCount} Rechnungen verarbeitet für ${MONTHS[selectedMonth]} ${selectedYear}`,
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
    try {
      await exportXML(selectedYear, selectedMonth + 1, steuernummer);
      toast({ title: "XML exportiert", description: "Datei wurde heruntergeladen – bereit für FinanzOnline" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
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
                <p className="text-sm text-muted-foreground">U 30 · Formular 2026 · Österreich</p>
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left: Umsätze */}
              <div className="rounded-xl bg-card card-shadow overflow-hidden">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="font-display font-semibold text-card-foreground">Lieferungen, Leistungen & Eigenverbrauch</h3>
                </div>
                <div>
                  <KZLine kz="" label="" netto={undefined} ust={undefined} isSeparator />
                  <div className="bg-muted/50 px-5 py-2">
                    <div className="flex items-center gap-3">
                      <span className="min-w-[52px]" />
                      <span className="flex-1 text-[10px] font-semibold text-muted-foreground uppercase">Bezeichnung</span>
                      <span className="min-w-[100px] text-[10px] font-semibold text-muted-foreground text-right uppercase">Bemessung</span>
                      <span className="min-w-[100px] text-[10px] font-semibold text-muted-foreground text-right uppercase">Umsatzsteuer</span>
                    </div>
                  </div>

                  <KZLine kz="" label="Steuerpflichtige Umsätze" isSeparator />
                  <KZLine kz="022" label="20% Normalsteuersatz" netto={n(p.kz022_netto)} ust={n(p.kz022_ust)} />
                  <KZLine kz="029" label="10% ermäßigter Steuersatz" netto={n(p.kz029_netto)} ust={n(p.kz029_ust)} />
                  <KZLine kz="006" label="13% ermäßigter Steuersatz" netto={n(p.kz006_netto)} ust={n(p.kz006_ust)} />
                  <KZLine kz="037" label="19% Jungholz/Mittelberg" netto={n(p.kz037_netto)} ust={n(p.kz037_ust)} />

                  <KZLine kz="" label="Steuerfreie Umsätze MIT Vorsteuerabzug" isSeparator />
                  <KZLine kz="011" label="Ausfuhrlieferungen (§6 Abs 1 Z1 iVm §7)" netto={n(p.kz011_netto)} showNetto />
                  <KZLine kz="017" label="IG Lieferungen (Art. 6 Abs 1)" netto={n(p.kz017_netto)} showNetto />
                  <KZLine kz="015" label="Seeschifffahrt, Luftfahrt, etc." netto={n(p.kz015_netto)} showNetto />

                  <KZLine kz="" label="Steuerfreie Umsätze OHNE Vorsteuerabzug" isSeparator />
                  <KZLine kz="019" label="Grundstücksumsätze (§6 Abs 1 Z9 lit a)" netto={n(p.kz019_netto)} showNetto />
                  <KZLine kz="016" label="Kleinunternehmer (§6 Abs 1 Z27)" netto={n(p.kz016_netto)} showNetto />
                  <KZLine kz="020" label="Übrige steuerfreie Umsätze" netto={n(p.kz020_netto)} showNetto />

                  <KZLine kz="" label="Weiters zu versteuern (Steuerschuld)" isSeparator />
                  <KZLine kz="056" label="§11 Abs 12/14, §16 Abs 2, Art 7 Abs 4" ust={n(p.kz056_ust)} showNetto={false} />
                  <KZLine kz="057" label="§19 Abs 1, 1c, 1e, Art 25 Abs 5" ust={n(p.kz057_ust)} showNetto={false} />
                  <KZLine kz="048" label="Bauleistungen (§19 Abs 1a)" ust={n(p.kz048_ust)} showNetto={false} />
                  <KZLine kz="044" label="Sicherungseigentum (§19 Abs 1b)" ust={n(p.kz044_ust)} showNetto={false} />
                  <KZLine kz="032" label="Schrott/Abfallstoffe (§19 Abs 1d)" ust={n(p.kz032_ust)} showNetto={false} />
                </div>
              </div>

              {/* Right: IG Erwerbe + Vorsteuer + Zahllast */}
              <div className="space-y-6">
                <div className="rounded-xl bg-card card-shadow overflow-hidden">
                  <div className="border-b border-border px-5 py-4">
                    <h3 className="font-display font-semibold text-card-foreground">Innergemeinschaftliche Erwerbe</h3>
                  </div>
                  <div>
                    <KZLine kz="070" label="Gesamtbetrag IG Erwerbe" netto={n(p.kz070_netto)} showNetto />
                    <KZLine kz="072" label="20% Normalsteuersatz" netto={n(p.kz072_netto)} ust={n(p.kz072_ust)} />
                    <KZLine kz="073" label="10% ermäßigt" netto={n(p.kz073_netto)} ust={n(p.kz073_ust)} />
                    <KZLine kz="008" label="13% ermäßigt" netto={n(p.kz008_netto)} ust={n(p.kz008_ust)} />
                  </div>
                </div>

                <div className="rounded-xl bg-card card-shadow overflow-hidden">
                  <div className="border-b border-border px-5 py-4">
                    <h3 className="font-display font-semibold text-card-foreground">Abziehbare Vorsteuer</h3>
                  </div>
                  <div>
                    <KZLine kz="060" label="Gesamtbetrag Vorsteuern" ust={n(p.kz060_vorsteuer)} showNetto={false} />
                    <KZLine kz="061" label="EUSt (§12 Abs 1 Z2 lit a)" ust={n(p.kz061_vorsteuer)} showNetto={false} />
                    <KZLine kz="083" label="EUSt auf Abgabenkonto" ust={n(p.kz083_vorsteuer)} showNetto={false} />
                    <KZLine kz="065" label="IG Erwerb Vorsteuer" ust={n(p.kz065_vorsteuer)} showNetto={false} />
                    <KZLine kz="066" label="§19 Abs 1 Vorsteuer" ust={n(p.kz066_vorsteuer)} showNetto={false} />
                    <KZLine kz="082" label="Bauleistungen Vorsteuer" ust={n(p.kz082_vorsteuer)} showNetto={false} />
                    <KZLine kz="062" label="Nicht abzugsfähig (§12 Abs 3)" ust={n(p.kz062_vorsteuer)} showNetto={false} />
                    <KZLine kz="063" label="Berichtigung (§12 Abs 10/11)" ust={n(p.kz063_vorsteuer)} showNetto={false} />
                    <KZLine kz="067" label="Berichtigung (§16)" ust={n(p.kz067_vorsteuer)} showNetto={false} />
                    <KZLine kz="090" label="Sonstige Berichtigungen" ust={n(p.kz090_betrag)} showNetto={false} />
                  </div>
                </div>

                {/* Zahllast */}
                <div className="rounded-xl bg-card card-shadow overflow-hidden">
                  <div className="px-5 py-6">
                    <KZLine
                      kz="095"
                      label={n(p.kz095_betrag) >= 0 ? "Vorauszahlung (Zahllast)" : "Überschuss (Gutschrift)"}
                      ust={n(p.kz095_betrag)}
                      isTotal
                      showNetto={false}
                    />
                    {p.due_date && (
                      <p className="text-xs text-muted-foreground mt-3 px-5">
                        Fällig am: {new Date(p.due_date).toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UVA;
