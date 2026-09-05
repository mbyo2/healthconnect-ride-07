import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary-500" />
      </div>
      <h3 className="font-display text-lg font-medium text-midnight mb-2 text-center">
        {title}
      </h3>
      <p className="text-sm text-graphite-500 mb-6 text-center max-w-md">
        {description}
      </p>
      <div className="flex items-center gap-3">
        {actionLabel && onAction && (
          <button onClick={onAction} className="vf-btn-primary">
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button onClick={onSecondaryAction} className="vf-btn-secondary">
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
