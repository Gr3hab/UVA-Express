import { Sidebar } from "@/components/Sidebar";
import { StatsCard } from "@/components/StatsCard";
import { InvoiceList } from "@/components/InvoiceList";
import { UploadZone } from "@/components/UploadZone";
import { UVAPreview } from "@/components/UVAPreview";
import { FileText, Euro, Receipt, CalendarClock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-64 min-h-screen">
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Jänner 2025 · Umsatzsteuervoranmeldung</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Alle Systeme aktiv
              </div>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                MK
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Rechnungen gesamt"
              value="47"
              subtitle="Diesen Monat"
              icon={FileText}
              trend={{ value: "12%", positive: true }}
            />
            <StatsCard
              title="Netto-Umsatz"
              value="€ 17.450"
              subtitle="Jänner 2025"
              icon={Euro}
              trend={{ value: "8%", positive: true }}
              variant="accent"
            />
            <StatsCard
              title="Vorsteuer"
              value="€ 1.845"
              subtitle="Abzugsfähig"
              icon={Receipt}
              variant="default"
            />
            <StatsCard
              title="Nächste UVA"
              value="15. Mär"
              subtitle="Noch 62 Tage"
              icon={CalendarClock}
              variant="warning"
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <InvoiceList />
              <UVAPreview />
            </div>
            <div>
              <UploadZone />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
