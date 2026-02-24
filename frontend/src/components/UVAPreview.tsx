import { Calculator, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUVA } from "@/hooks/useUVA";
import { useMemo } from "react";

export const UVAPreview = () => {
  const navigate = useNavigate();
  const { periods, loading } = useUVA();

  const latest = useMemo(() => {
    if (!periods.length) return null;
    return periods[0]; // already sorted desc
  }, [periods]);

  const MONTHS = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  const fmt = (v: number | null | undefined) => {
    if (!v) return "–";
    return `€ ${Number(v).toLocaleString("de-AT", { minimumFractionDigits: 2 })}`;
  };

  const lines = latest ? [
    { kz: "022", label: "20% Normalsteuersatz", netto: fmt(latest.kz022_netto), ust: fmt(latest.kz022_ust) },
    { kz: "029", label: "10% ermäßigt", netto: fmt(latest.kz029_netto), ust: fmt(latest.kz029_ust) },
    { kz: "006", label: "13% ermäßigt", netto: fmt(latest.kz006_netto), ust: fmt(latest.kz006_ust) },
    { kz: "060", label: "Vorsteuer", netto: "", ust: fmt(latest.kz060_vorsteuer) },
  ] : [];

  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Calculator className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-card-foreground">UVA Vorschau</h3>
            <p className="text-xs text-muted-foreground">
              {latest ? `${MONTHS[latest.period_month - 1]} ${latest.period_year}` : "Keine Daten"}
            </p>
          </div>
        </div>
        {latest?.due_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Fällig: {new Date(latest.due_date).toLocaleDateString("de-AT")}
          </div>
        )}
      </div>

      {lines.length > 0 ? (
        <div className="divide-y divide-border">
          {lines.map((line) => (
            <div key={line.kz} className="flex items-center gap-4 px-5 py-3">
              <span className="flex h-7 w-10 items-center justify-center rounded bg-muted text-xs font-mono font-semibold text-muted-foreground">
                KZ {line.kz}
              </span>
              <span className="flex-1 text-sm text-card-foreground">{line.label}</span>
              {line.netto && <span className="text-sm text-muted-foreground">{line.netto}</span>}
              <span className="text-sm font-semibold text-card-foreground min-w-[90px] text-right">{line.ust}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Noch keine UVA berechnet
        </div>
      )}

      <div className="border-t-2 border-accent/20 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {latest ? (Number(latest.kz095_betrag) >= 0 ? "Zahllast" : "Gutschrift") : "Zahllast"}
          </p>
          <p className="font-display text-xl font-bold text-card-foreground">
            {latest ? fmt(Math.abs(Number(latest.kz095_betrag))) : "–"}
          </p>
        </div>
        <button
          onClick={() => navigate("/uva")}
          className="inline-flex items-center gap-2 rounded-lg gradient-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity"
        >
          UVA öffnen
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
