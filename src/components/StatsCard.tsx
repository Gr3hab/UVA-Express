import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "accent" | "warning";
}

export const StatsCard = ({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  return (
    <div className="rounded-xl bg-card p-5 card-shadow hover:card-shadow-hover transition-shadow duration-300 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div>
            <p className="font-display text-2xl font-bold text-card-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          variant === "accent" && "bg-accent/10 text-accent",
          variant === "warning" && "bg-warning/10 text-warning",
          variant === "default" && "bg-primary/10 text-primary"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
