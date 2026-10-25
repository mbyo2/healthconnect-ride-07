import { Shield, ShieldCheck, CheckCircle2, Circle, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HealthMilestone {
  id: string;
  label: string;
  completed: boolean;
  icon?: any;
}

interface HealthStreakProps {
  milestones: HealthMilestone[];
  streakDays?: number;
}

/**
 * Duolingo-style health shield: visual wellness streak.
 * Completing checkups lights up the shield; neglecting dims it.
 */
export const HealthStreak = ({ milestones, streakDays = 0 }: HealthStreakProps) => {
  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFull = completed === total && total > 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Shield visual */}
          <div className="relative shrink-0">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center ${
                isFull ? "bg-primary" : "bg-primary-100"
              }`}
            >
              {isFull ? (
                <ShieldCheck className="h-8 w-8 text-white" />
              ) : (
                <Shield className={`h-8 w-8 ${pct > 50 ? "text-primary-600" : "text-primary-300"}`} />
              )}
            </div>
            {streakDays > 0 && (
              <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 bg-amber-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {streakDays}
                <Flame className="h-3 w-3" aria-hidden />
              </span>
            )}
          </div>

          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">Health Shield</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {completed}/{total} checkups complete
            </p>
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs ${
                  m.completed
                    ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {m.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" />
                )}
                <span className="font-medium truncate">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
