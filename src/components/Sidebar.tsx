import { LayoutDashboard, FileText, Upload, Calculator, Settings, HelpCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FileText, label: "Rechnungen", active: false },
  { icon: Upload, label: "Upload", active: false },
  { icon: Calculator, label: "UVA", active: false },
  { icon: TrendingUp, label: "Berichte", active: false },
  { icon: Settings, label: "Einstellungen", active: false },
];

export const Sidebar = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-primary flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent">
          <Calculator className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-primary-foreground">VAT Pilot</h1>
          <p className="text-xs text-sidebar-foreground/60">Österreich</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              i === activeIndex
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
          <HelpCircle className="h-4.5 w-4.5" />
          Hilfe & Support
        </button>
      </div>
    </aside>
  );
};
