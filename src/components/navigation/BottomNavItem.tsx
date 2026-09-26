
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";

interface BottomNavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  description: string;
}

export function BottomNavItem({ to, label, icon, active, description }: BottomNavItemProps) {
  const touchFeedbackProps = useTouchFeedback({
    rippleColor: '#397dff',
    rippleOpacity: 0.12
  });

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        // min-w-0 lets flex-1 items shrink at 360px instead of pushing
        // siblings (incl. the More trigger) off-screen.
        "relative flex flex-1 min-w-0 flex-col items-center justify-center py-1.5 px-2 rounded-pill transition-all min-h-[50px] touch-manipulation group",
        active
          ? "text-primary-500"
          : "text-graphite-500 hover:text-midnight dark:text-slate-400 dark:hover:text-slate-100"
      )}
      {...touchFeedbackProps}
      aria-label={`${label} - ${description}`}
    >
      <div className={cn(
        "p-2 rounded-full transition-all duration-200 flex items-center justify-center",
        active
          ? "bg-primary-50 dark:bg-blue-950/60 text-primary-500 shadow-xs scale-105"
          : "group-hover:bg-canvas-mist dark:group-hover:bg-slate-800"
      )}>
        {icon}
      </div>
      {active && (
        <span className="w-1 h-1 rounded-full bg-primary-500 mt-0.5 animate-in fade-in zoom-in" />
      )}
      {/* Icon-only below 400px: long labels (e.g. "Appointments") can't fit a
          ~62px slot at 360px and would truncate to unreadable. The full label
          stays on aria-label for screen readers. */}
      <span className={cn(
        "hidden min-[400px]:block max-w-full truncate text-[10px] font-medium leading-none tracking-wide mt-0.5",
        active ? "text-primary-500" : "text-graphite-500 dark:text-slate-400"
      )}>
        {label}
      </span>
    </Link>
  );
}

