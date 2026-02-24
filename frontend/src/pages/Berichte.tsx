import { Sidebar } from "@/components/Sidebar";
import { TrendingUp, BarChart3, PieChart, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";

const Berichte = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const reportData = useMemo(() => {
    const completed = invoices.filter(i => i.ocr_status === "completed");
    const totalNet = completed.reduce((s, i) => s + (i.net_amount || 0), 0);
    const totalVat = completed.reduce((s, i) => s + (i.vat_amount || 0), 0);
    const totalGross = completed.reduce((s, i) => s + (i.gross_amount || 0), 0);

    const byType = {
      eingang: completed.filter(i => i.invoice_type === "eingang").length,
      ausgang: completed.filter(i => i.invoice_type === "ausgang").length,
    };

    return { totalNet, totalVat, totalGross, byType, count: completed.length };
  }, [invoices]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onSignOut={signOut} userEmail={user.email} />

      <main className="ml-64 min-h-screen">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm px-8 py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Berichte</h1>
                <p className="text-sm text-muted-foreground">Umsatzübersicht und Statistiken</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rechnungen erfasst</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.count}</div>
                <p className="text-xs text-muted-foreground mt-1">Alle Rechnungstypen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Netto-Umsatz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  € {reportData.totalNet.toLocaleString("de-AT", { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Summe aller Eingangsrechnungen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vorsteuer abzugsfähig</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  € {reportData.totalVat.toLocaleString("de-AT", { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Für UVA-Berechnung</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gesamtbetrag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  € {reportData.totalGross.toLocaleString("de-AT", { maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Brutto aller Rechnungen</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rechnungsverteilung</CardTitle>
              <CardDescription>Nach Rechnungstyp</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <BarChart3 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eingangsrechnungen</p>
                    <p className="text-xl font-bold">{reportData.byType.eingang}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <PieChart className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ausgangsrechnungen</p>
                    <p className="text-xl font-bold">{reportData.byType.ausgang}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                UVA-Fristen
              </CardTitle>
              <CardDescription>Nächste Abgabetermine</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <span className="font-medium">Nächste UVA-Abgabe</span>
                  <span className="text-accent font-semibold">15. März 2026</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <span className="font-medium">Folgende UVA-Abgabe</span>
                  <span className="text-muted-foreground">15. April 2026</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Berichte;
