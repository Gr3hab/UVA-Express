import { Sidebar } from "@/components/Sidebar";
import { InvoiceList } from "@/components/InvoiceList";
import { FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInvoices } from "@/hooks/useInvoices";

const Rechnungen = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { invoices, loading: invoicesLoading } = useInvoices();

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
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Rechnungen</h1>
                <p className="text-sm text-muted-foreground">Alle erfassten Rechnungen anzeigen und bearbeiten</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl">
          <InvoiceList invoices={invoices} loading={invoicesLoading} />
        </div>
      </main>
    </div>
  );
};

export default Rechnungen;
