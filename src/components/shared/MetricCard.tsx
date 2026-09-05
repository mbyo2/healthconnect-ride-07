import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: string;
  onClick?: () => void;
}

export const MetricCard = ({ 
  label, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = '#397dff',
  onClick 
}: MetricCardProps) => {
  return (
    <div 
      className={`vf-card p-4 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-graphite-500 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-2xl font-display font-medium text-midnight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-graphite-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${trend.isPositive ? 'text-success-500' : 'text-error-500'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-graphite-500">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

interface SimpleMetricProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
}

export const SimpleMetric = ({ label, value, icon: Icon, color = '#397dff' }: SimpleMetricProps) => {
  return (
    <div className="flex items-center gap-3 p-3 vf-card">
      {Icon && (
        <div 
          className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div>
        <p className="text-xs text-graphite-500">{label}</p>
        <p className="text-lg font-display font-medium text-midnight">{value}</p>
      </div>
    </div>
  );
};

interface ActionableCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: ReactNode;
  variant?: 'info' | 'warning' | 'success';
}

export const ActionableCard = ({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  icon,
  variant = 'info'
}: ActionableCardProps) => {
  const colors = {
    info: { bg: 'bg-primary-50', border: 'border-primary-200', text: 'text-primary-700' },
    warning: { bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-700' },
    success: { bg: 'bg-success-50', border: 'border-success-200', text: 'text-success-700' },
  };

  const style = colors[variant];

  return (
    <div className={`p-4 rounded-card border ${style.border} ${style.bg}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className={`${style.text} flex-shrink-0 mt-1`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-medium text-midnight text-sm mb-1">
            {title}
          </h3>
          <p className="text-xs text-graphite-500 mb-3">
            {description}
          </p>
          <button 
            onClick={onAction}
            className="vf-btn-secondary text-xs px-3 py-1.5"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
