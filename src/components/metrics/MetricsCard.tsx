import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  subtitle?: string;
}

export function MetricsCard({ label, value, icon: Icon, iconColor = "text-primary-500", trend, subtitle }: MetricsCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend?.direction === "up" ? "text-success-600" : trend?.direction === "down" ? "text-error-600" : "text-muted-foreground";
  // Anatomy (sweep 2026-11-11): icon tiles take ONE accent (action blue)
  // — callers historically passed a rainbow per metric. Alert semantics
  // survive: destructive/error icon colours pass through unchanged.
  const iconTone =
    iconColor === "text-destructive" || iconColor === "text-error-500"
      ? iconColor
      : "text-primary-600";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-muted-foreground truncate">{label}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight truncate">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>}
            {trend && (
              <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{trend.value > 0 ? "+" : ""}{trend.value}%</span>
                <span className="text-muted-foreground font-normal">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`shrink-0 rounded-xl bg-primary-50 dark:bg-slate-800 p-2.5 ${iconTone}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
