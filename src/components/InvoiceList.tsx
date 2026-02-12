import { FileText, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types/invoice";

const statusConfig = {
  completed: { icon: CheckCircle2, label: "Erfasst", className: "bg-success/10 text-success" },
  pending: { icon: Clock, label: "Ausstehend", className: "bg-warning/10 text-warning" },
  processing: { icon: Loader2, label: "Scannt...", className: "bg-info/10 text-info" },
  error: { icon: AlertCircle, label: "Fehler", className: "bg-destructive/10 text-destructive" },
};

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
}

export const InvoiceList = ({ invoices, loading }: InvoiceListProps) => {
  const formatCurrency = (amount: number | null) =>
    amount != null ? `€ ${amount.toLocaleString("de-AT", { minimumFractionDigits: 2 })}` : "–";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "–";
    return new Date(dateStr).toLocaleDateString("de-AT");
  };

  return (
    <div className="rounded-xl bg-card card-shadow animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display font-semibold text-card-foreground">Rechnungen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {invoices.length} Rechnung{invoices.length !== 1 ? "en" : ""} gesamt
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 px-5">
          <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Noch keine Rechnungen</p>
          <p className="text-xs text-muted-foreground mt-1">Lade eine Rechnung hoch um zu starten</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {invoices.map((invoice) => {
            const status = statusConfig[invoice.ocr_status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div key={invoice.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {invoice.vendor_name || invoice.file_name || "Unbekannt"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.invoice_number || "–"} · {formatDate(invoice.invoice_date || invoice.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-card-foreground">{formatCurrency(invoice.gross_amount)}</p>
                  <p className="text-xs text-muted-foreground">USt {formatCurrency(invoice.vat_amount)}</p>
                </div>
                <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", status.className)}>
                  <StatusIcon className={cn("h-3 w-3", invoice.ocr_status === "processing" && "animate-spin")} />
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
