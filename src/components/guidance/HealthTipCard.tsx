import { Heart, Lightbulb, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';

interface HealthTipCardProps {
  title: string;
  tip: string;
  category?: 'wellness' | 'prevention' | 'lifestyle';
  source?: string;
  actionable?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

export const HealthTipCard = ({
  title,
  tip,
  category = 'wellness',
  source,
  actionable,
  dismissible = true,
}: HealthTipCardProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const categoryConfig = {
    wellness: {
      icon: Heart,
      color: 'text-success-600',
      bg: 'bg-success-50',
      border: 'border-success-200',
    },
    prevention: {
      icon: TrendingUp,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      border: 'border-primary-200',
    },
    lifestyle: {
      icon: Lightbulb,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
      border: 'border-warning-200',
    },
  };

  const config = categoryConfig[category];
  const Icon = config.icon;

  return (
    <div className={`rounded-card border ${config.border} ${config.bg} p-4 relative`}>
      {dismissible && (
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 text-graphite-400 hover:text-graphite-600"
          aria-label="Dismiss tip"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div className={`${config.color} flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-display font-medium text-sm text-midnight mb-1">
            💡 {title}
          </h4>
          <p className="text-xs text-graphite-600 mb-3">
            {tip}
          </p>

          {source && (
            <p className="text-xs text-graphite-500 italic mb-3">
              Source: {source}
            </p>
          )}

          {actionable && (
            <button
              onClick={actionable.onClick}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 underline"
            >
              {actionable.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
