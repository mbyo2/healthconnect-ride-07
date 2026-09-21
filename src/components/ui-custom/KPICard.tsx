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

export const KPICard = ({ title, value, subtitle, icon: Icon, color = "text-primary-500", trend }: KPICardProps) => {
  return (
    <Card className="rounded-card border-canvas-silk shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold text-graphite-500 dark:text-slate-400 uppercase">{title}</span>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
        <div className="text-[10px] text-graphite-500 dark:text-slate-400 font-bold mt-0.5">{subtitle}</div>
        {trend && (
          <div className={`text-[10px] font-bold mt-1 ${trend.isPositive ? "text-success-500" : "text-error-500"}`}>
            {trend.isPositive ? "+" : ""}{trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};