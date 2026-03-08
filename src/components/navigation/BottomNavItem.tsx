
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
    rippleColor: 'var(--primary)',
    rippleOpacity: 0.12
  });

  return (
    <Link
      to={to}
      className={cn(
        "relative flex flex-1 basis-0 flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-200 min-h-0 touch-manipulation select-none",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground/70 active:text-foreground/50"
      )}
      {...touchFeedbackProps}
      aria-label={`${label} - ${description}`}
    >
      <div className={cn(
        "flex items-center justify-center w-10 h-7 sm:w-12 sm:h-8 rounded-full transition-all duration-200",
        active && "bg-primary/12 scale-105"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] sm:text-[11px] font-semibold leading-tight text-center tracking-tight",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </Link>
  );
}
