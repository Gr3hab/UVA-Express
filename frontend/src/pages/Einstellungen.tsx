import { Sidebar } from "@/components/Sidebar";
import { Settings, Lock, User, Bell, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const Einstellungen = () => {
  const { user, loading: authLoading, signOut } = useAuth();

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
                <Settings className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Einstellungen</h1>
                <p className="text-sm text-muted-foreground">Verwalten Sie Ihre Kontoeinstellungen</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-2xl">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle>Profil</CardTitle>
                    <CardDescription>Ihre Kontoinformationen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">E-Mail-Adresse</Label>
                  <Input id="email" type="email" value={user.email || ""} disabled className="mt-2" />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Konto erstellt: {new Date(user.created_at || "").toLocaleDateString("de-AT")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle>Sicherheit</CardTitle>
                    <CardDescription>Passwort und Authentifizierung</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  Passwort ändern
                </Button>
                <p className="text-xs text-muted-foreground">
                  Ändern Sie Ihr Passwort regelmäßig, um Ihr Konto sicher zu halten.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle>Benachrichtigungen</CardTitle>
                    <CardDescription>Verwaltung von Benachrichtigungen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">UVA-Frist-Erinnerungen</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Rechnungs-Upload-Bestätigung</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">Newsletter und Tipps</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LogOut className="h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle>Konto löschen</CardTitle>
                    <CardDescription>Permanente Kontoentfernung</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Das Löschen Ihres Kontos ist permanent und kann nicht rückgängig gemacht werden.
                  Alle Ihre Daten werden gelöscht.
                </p>
                <Button variant="destructive">Konto löschen</Button>
              </CardContent>
            </Card>

            <div className="flex justify-start pt-4">
              <Button onClick={signOut} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Einstellungen;
