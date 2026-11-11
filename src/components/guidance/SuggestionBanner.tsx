import { LucideIcon, X, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
  variant?: 'info' | 'success' | 'warning' | 'tip' | 'plain';
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

  // Dark mode: the *-50 tints are fixed pale hexes that never adapt,
  // while index.css remaps .text-graphite-600 to a light grey under
  // .dark — a pale slab ends up carrying light text (~1.2:1, the
  // /appointments defect). Every variant therefore pairs its tint with
  // a translucent dark surface, a dark border step and light title/icon
  // steps, the same /10-tint treatment StatusBanners uses. Only steps
  // that exist in tailwind.config.ts are used (success/warning ramps
  // end at 700, so their light titles use 700 — the old 900 classes
  // named steps that were never generated).
  const variants = {
    info: {
      bg: 'bg-primary-50 dark:bg-primary-500/10',
      border: 'border-primary-200 dark:border-primary-500/30',
      icon: 'text-primary-600 dark:text-primary-400',
      title: 'text-primary-900 dark:text-primary-100',
    },
    success: {
      bg: 'bg-success-50 dark:bg-success-500/10',
      border: 'border-success-200 dark:border-success-500/30',
      icon: 'text-success-600 dark:text-success-400',
      title: 'text-success-700 dark:text-success-100',
    },
    warning: {
      bg: 'bg-warning-50 dark:bg-warning-500/10',
      border: 'border-warning-200 dark:border-warning-500/30',
      icon: 'text-warning-600 dark:text-warning-400',
      title: 'text-warning-700 dark:text-warning-100',
    },
    tip: {
      bg: 'bg-accent-50 dark:bg-accent-500/10',
      border: 'border-accent-200 dark:border-accent-500/30',
      icon: 'text-accent-600 dark:text-accent-400',
      title: 'text-accent-900 dark:text-accent-100',
    },
    // Plain (PayPal anatomy): a guidance prompt is not a status, so it
    // carries no tint at all — white hairline card (bg-card adapts to
    // dark mode on its own), blue icon, foreground title. Used on the
    // patient shell (Appointments "Get Started", Prescriptions empty
    // state) where the pale-blue info slab read as an unfinished tint.
    plain: {
      bg: 'bg-card',
      border: 'border-border',
      icon: 'text-primary-600 dark:text-primary-400',
      title: 'text-foreground',
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
          <h3 className={`font-medium text-sm ${style.title} mb-1`}>
            {title}
          </h3>
          <p className="text-xs text-graphite-600 mb-3">
            {description}
          </p>
          
          {actions && actions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.variant === 'primary' ? 'default' : 'outline'}
                  onClick={action.onClick}
                >
                  {action.label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
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
