import { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: string;
  badge?: string | number;
  variant?: string;
}

interface QuickActionsProps {
  title?: string;
  actions: QuickAction[];
}

export const QuickActions = ({ title = 'Quick Actions', actions }: QuickActionsProps) => {
  return (
    <div className="vf-card p-5">
      <h3 className="font-display text-sm font-medium text-midnight mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const color = action.color || '#397dff';
          
          return (
            <button
              key={idx}
              onClick={action.onClick}
              className="relative flex flex-col items-center gap-2 p-4 rounded-xl border border-canvas-silk hover:border-primary-200 hover:bg-primary-50 transition-all group"
            >
              {action.badge && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-pill text-xs font-medium bg-error-500 text-white">
                  {action.badge}
                </span>
              )}
              <div 
                className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium text-graphite-600 text-center">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
