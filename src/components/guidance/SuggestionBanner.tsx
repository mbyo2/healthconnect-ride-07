import { LucideIcon, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SuggestionBannerProps {
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  icon?: LucideIcon;
  variant?: 'info' | 'success' | 'warning' | 'tip';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const SuggestionBanner = ({
  title,
  description,
  actions,
  icon: Icon,
  variant = 'info',
  dismissible = true,
  onDismiss,
}: SuggestionBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const variants = {
    info: {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      icon: 'text-primary-600',
      title: 'text-primary-900',
    },
    success: {
      bg: 'bg-success-50',
      border: 'border-success-200',
      icon: 'text-success-600',
      title: 'text-success-900',
    },
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-200',
      icon: 'text-warning-600',
      title: 'text-warning-900',
    },
    tip: {
      bg: 'bg-accent-50',
      border: 'border-accent-200',
      icon: 'text-accent-600',
      title: 'text-accent-900',
    },
  };

  const style = variants[variant];

  return (
    <div className={`relative rounded-card border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`${style.icon} flex-shrink-0 mt-0.5`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-display font-medium text-sm ${style.title} mb-1`}>
            {title}
          </h3>
          <p className="text-xs text-graphite-600 mb-3">
            {description}
          </p>
          
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={
                    action.variant === 'primary'
                      ? 'vf-btn-primary text-xs px-3 py-1.5'
                      : 'vf-btn-secondary text-xs px-3 py-1.5'
                  }
                >
                  {action.label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-graphite-400 hover:text-graphite-600 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
