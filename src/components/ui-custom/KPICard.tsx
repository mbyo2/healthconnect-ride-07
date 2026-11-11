import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const KPICard = ({ title, value, subtitle, icon: Icon, color = "text-muted-foreground", trend }: KPICardProps) => {
  return (
    // Anatomy (sweep 2026-11-11): hairline shadowless card, INK tabular
    // value — the `color` prop now tints only the icon (default muted);
    // values are never rainbow. Trend deltas keep semantic colours.
    <Card className="rounded-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground font-bold mt-0.5">{subtitle}</div>
        {trend && (
          <div className={`text-xs font-bold mt-1 ${trend.isPositive ? "text-success-500" : "text-error-500"}`}>
            {trend.isPositive ? "+" : ""}{trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};