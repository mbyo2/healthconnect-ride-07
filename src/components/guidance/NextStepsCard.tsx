import { CheckCircle, Circle, ChevronRight } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  onClick?: () => void;
}

interface NextStepsCardProps {
  title?: string;
  steps: Step[];
  completedCount?: number;
}

export const NextStepsCard = ({ 
  title = 'Next Steps', 
  steps,
  completedCount
}: NextStepsCardProps) => {
  const completed = completedCount ?? steps.filter(s => s.completed).length;
  const total = steps.length;
  const progress = (completed / total) * 100;

  return (
    <div className="vf-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-medium text-midnight">
          {title}
        </h3>
        <span className="text-xs font-medium text-graphite-500">
          {completed} of {total} complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-graphite-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-success-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={step.onClick}
            disabled={step.completed}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
              step.completed
                ? 'border-success-200 bg-success-50 cursor-default'
                : 'border-canvas-silk hover:border-primary-200 hover:bg-primary-50 cursor-pointer'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="h-5 w-5 text-success-500" />
              ) : (
                <Circle className="h-5 w-5 text-graphite-400" />
              )}
            </div>
            
            <div className="flex-1 text-left min-w-0">
              <p className={`text-sm font-medium ${
                step.completed ? 'text-success-700 line-through' : 'text-midnight'
              }`}>
                {step.label}
              </p>
              {step.description && !step.completed && (
                <p className="text-xs text-graphite-500 mt-1">
                  {step.description}
                </p>
              )}
            </div>

            {!step.completed && step.onClick && (
              <ChevronRight className="h-4 w-4 text-graphite-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
