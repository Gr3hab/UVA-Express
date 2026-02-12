import { Calculator, ArrowRight, Calendar } from "lucide-react";

const uvaLines = [
  { kz: "000", label: "Lieferungen / Leistungen 20%", netto: "€ 12.450,00", ust: "€ 2.490,00" },
  { kz: "001", label: "Lieferungen / Leistungen 10%", netto: "€ 3.200,00", ust: "€ 320,00" },
  { kz: "021", label: "Innergemeinschaftl. Erwerbe", netto: "€ 1.800,00", ust: "€ 360,00" },
  { kz: "060", label: "Vorsteuer", netto: "", ust: "€ 1.845,30" },
];

export const UVAPreview = () => {
  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.4s" }}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Calculator className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-card-foreground">UVA Vorschau</h3>
            <p className="text-xs text-muted-foreground">Jänner 2025</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Fällig: 15.03.2025
        </div>
      </div>

      <div className="divide-y divide-border">
        {uvaLines.map((line) => (
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

      <div className="border-t-2 border-accent/20 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Zahllast</p>
          <p className="font-display text-xl font-bold text-card-foreground">€ 1.324,70</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg gradient-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity">
          UVA einreichen
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
