import { LayoutDashboard, FileText, Upload, Calculator, Settings, HelpCircle, TrendingUp, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FileText, label: "Rechnungen", path: "/" },
  { icon: Upload, label: "Upload", path: "/" },
  { icon: Calculator, label: "UVA", path: "/uva" },
  { icon: TrendingUp, label: "Berichte", path: "/" },
  { icon: Settings, label: "Einstellungen", path: "/" },
];

interface SidebarProps {
  onSignOut?: () => void;
  userEmail?: string;
}

export const Sidebar = ({ onSignOut, userEmail }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-primary flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent">
          <Calculator className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-primary-foreground">UVA Express</h1>
          <p className="text-xs text-sidebar-foreground/60">UVA in Minuten statt Stunden</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              location.pathname === item.path
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-1">
        {userEmail && (
          <p className="px-3 py-1 text-xs text-sidebar-foreground/50 truncate">{userEmail}</p>
        )}
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
          Hilfe & Support
        </button>
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        )}
      </div>
    </aside>
  );
};
