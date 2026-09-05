import { LucideIcon, Sparkles, ArrowRight } from 'lucide-react';

interface RecommendationCardProps {
  title: string;
  description: string;
  reason?: string;
  icon?: LucideIcon;
  action: {
    label: string;
    onClick: () => void;
  };
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export const RecommendationCard = ({
  title,
  description,
  reason,
  icon: Icon,
  action,
  priority = 'medium',
  tags,
}: RecommendationCardProps) => {
  const priorityColors = {
    high: 'border-error-200 bg-error-50',
    medium: 'border-primary-200 bg-primary-50',
    low: 'border-graphite-200 bg-graphite-50',
  };

  const priorityBadges = {
    high: 'bg-error-500 text-white',
    medium: 'bg-primary-500 text-white',
    low: 'bg-graphite-400 text-white',
  };

  return (
    <div className={`rounded-card border ${priorityColors[priority]} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon className="h-5 w-5 text-primary-600" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-medium text-sm text-midnight">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Sparkles className="h-3 w-3 text-primary-500" />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-pill ${priorityBadges[priority]}`}>
                {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Recommended' : 'Optional'}
              </span>
            </div>
          </div>

          <p className="text-xs text-graphite-600 mb-3">
            {description}
          </p>

          {reason && (
            <p className="text-xs text-graphite-500 italic mb-3 pl-3 border-l-2 border-primary-300">
              {reason}
            </p>
          )}

          {tags && tags.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-pill bg-white border border-canvas-silk text-graphite-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={action.onClick}
            className="vf-btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
