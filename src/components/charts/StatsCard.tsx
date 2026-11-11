import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  color?: string;
  sparklineData?: Array<{ value: number }>;
}

export const StatsCard = ({ 
  label, 
  value, 
  change, 
  icon: Icon,
  color = '#0066f5',
  sparklineData
}: StatsCardProps) => {
  return (
    <div className="vf-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {label}
          </p>
          <p className="text-[clamp(1.5rem,7vw,1.875rem)] font-medium text-midnight mb-2 tnum">
            {value}
          </p>
          {change && (
            <div className="flex flex-wrap items-center gap-1.5">
              {change.isPositive ? (
                <TrendingUp className="h-4 w-4 text-success-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-error-500" />
              )}
              <span className={`text-sm font-medium ${change.isPositive ? 'text-success-600' : 'text-error-600'}`}>
                {change.value}
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div 
            className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      
      {sparklineData && sparklineData.length > 0 && (
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
