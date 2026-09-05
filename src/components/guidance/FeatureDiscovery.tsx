import { X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FeatureDiscoveryProps {
  feature: {
    id: string;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  position?: 'top' | 'bottom' | 'center';
  storageKey?: string; // To remember dismissal
}

export const FeatureDiscovery = ({
  feature,
  position = 'top',
  storageKey,
}: FeatureDiscoveryProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this feature before
    if (storageKey) {
      const dismissed = localStorage.getItem(`feature-dismissed-${storageKey}`);
      if (dismissed === 'true') {
        return;
      }
    }
    
    // Show after a short delay
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (storageKey) {
      localStorage.setItem(`feature-dismissed-${storageKey}`, 'true');
    }
  };

  if (!isVisible) return null;

  const positions = {
    top: 'top-4',
    bottom: 'bottom-4',
    center: 'top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`fixed right-4 ${positions[position]} z-50 max-w-sm animate-in slide-in-from-right duration-300`}
    >
      <div className="vf-card p-4 shadow-2xl border-2 border-primary-200">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                  New Feature
                </span>
                <h4 className="font-display font-medium text-sm text-midnight">
                  {feature.title}
                </h4>
              </div>
              <button
                onClick={handleDismiss}
                className="text-graphite-400 hover:text-graphite-600 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-graphite-600 mb-3">
              {feature.description}
            </p>

            <div className="flex items-center gap-2">
              {feature.action && (
                <button
                  onClick={() => {
                    feature.action!.onClick();
                    handleDismiss();
                  }}
                  className="vf-btn-primary text-xs px-3 py-1.5"
                >
                  {feature.action.label}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-xs font-medium text-graphite-500 hover:text-graphite-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
