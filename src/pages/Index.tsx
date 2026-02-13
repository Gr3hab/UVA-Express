import { Sidebar } from "@/components/Sidebar";
import Auth from "@/pages/Auth";
import { StatsCard } from "@/components/StatsCard";
import { InvoiceList } from "@/components/InvoiceList";
import { UploadZone } from "@/components/UploadZone";
import { UVAPreview } from "@/components/UVAPreview";
import { FileText, Euro, Receipt, CalendarClock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { invoices, loading: invoicesLoading, uploadAndScan } = useInvoices();

  const stats = useMemo(() => {
    const completed = invoices.filter(i => i.ocr_status === "completed");
    const totalNet = completed.reduce((s, i) => s + (i.net_amount || 0), 0);
    const totalVat = completed.reduce((s, i) => s + (i.vat_amount || 0), 0);
    return { count: invoices.length, totalNet, totalVat };
  }, [invoices]);

  // Show auth page if not logged in
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={signOut} userEmail={user.email} />

      <main className="ml-64 min-h-screen">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Umsatzsteuervoranmeldung · Österreich</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Alle Systeme aktiv
              </div>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Rechnungen gesamt" value={String(stats.count)} subtitle="Erfasst" icon={FileText} />
            <StatsCard
              title="Netto-Umsatz"
              value={`€ ${stats.totalNet.toLocaleString("de-AT", { minimumFractionDigits: 0 })}`}
              icon={Euro}
              variant="accent"
            />
            <StatsCard
              title="Vorsteuer"
              value={`€ ${stats.totalVat.toLocaleString("de-AT", { minimumFractionDigits: 0 })}`}
              subtitle="Abzugsfähig"
              icon={Receipt}
            />
            <StatsCard title="Nächste UVA" value="15. Mär" subtitle="Fällig" icon={CalendarClock} variant="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InvoiceList invoices={invoices} loading={invoicesLoading} />
              <UVAPreview />
            </div>
            <div>
              <UploadZone onUpload={uploadAndScan} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
