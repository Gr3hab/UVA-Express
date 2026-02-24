import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Calculator, Mail, Lock, ArrowRight } from "lucide-react";

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const result = isLogin
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error.message);
    } else if (!isLogin) {
      setSuccess("Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-accent mb-4">
            <Calculator className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">UVA Express</h1>
          <p className="text-sm text-muted-foreground mt-1">Ihre UVA in Minuten – Sparen Sie beim Steuerberater</p>
        </div>

        <div className="rounded-xl bg-card card-shadow p-6">
          <h2 className="font-display text-lg font-semibold text-card-foreground mb-4">
            {isLogin ? "Anmelden" : "Konto erstellen"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-card-foreground mb-1.5 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@beispiel.at"
                  required
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-1.5 block">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg gradient-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Laden..." : isLogin ? "Anmelden" : "Registrieren"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {isLogin ? "Noch kein Konto? Registrieren" : "Bereits ein Konto? Anmelden"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
          <span>·</span>
          <a href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
