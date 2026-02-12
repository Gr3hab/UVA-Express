import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type InvoiceStatus = "erfasst" | "ausstehend" | "fehler";

interface Invoice {
  id: string;
  vendor: string;
  date: string;
  amount: string;
  vat: string;
  status: InvoiceStatus;
}

const statusConfig: Record<InvoiceStatus, { icon: typeof CheckCircle2; label: string; className: string }> = {
  erfasst: { icon: CheckCircle2, label: "Erfasst", className: "bg-success/10 text-success" },
  ausstehend: { icon: Clock, label: "Ausstehend", className: "bg-warning/10 text-warning" },
  fehler: { icon: AlertCircle, label: "Fehler", className: "bg-destructive/10 text-destructive" },
};

const mockInvoices: Invoice[] = [
  { id: "RE-2024-001", vendor: "A1 Telekom Austria", date: "12.01.2025", amount: "€ 89,90", vat: "€ 14,98", status: "erfasst" },
  { id: "RE-2024-002", vendor: "REWE Group Österreich", date: "10.01.2025", amount: "€ 234,50", vat: "€ 39,08", status: "erfasst" },
  { id: "RE-2024-003", vendor: "Wiener Stadtwerke", date: "08.01.2025", amount: "€ 156,30", vat: "€ 26,05", status: "ausstehend" },
  { id: "RE-2024-004", vendor: "ÖBB Infrastruktur", date: "05.01.2025", amount: "€ 45,00", vat: "€ 7,50", status: "erfasst" },
  { id: "RE-2024-005", vendor: "Mediamarkt Wien", date: "03.01.2025", amount: "€ 1.299,00", vat: "€ 216,50", status: "fehler" },
];

export const InvoiceList = () => {
  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display font-semibold text-card-foreground">Letzte Rechnungen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Automatisch gescannt & kategorisiert</p>
        </div>
        <button className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">
          Alle anzeigen →
        </button>
      </div>

      <div className="divide-y divide-border">
        {mockInvoices.map((invoice) => {
          const status = statusConfig[invoice.status];
          const StatusIcon = status.icon;
          return (
            <div key={invoice.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{invoice.vendor}</p>
                <p className="text-xs text-muted-foreground">{invoice.id} · {invoice.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-card-foreground">{invoice.amount}</p>
                <p className="text-xs text-muted-foreground">USt {invoice.vat}</p>
              </div>
              <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
