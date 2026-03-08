
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
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-colors min-h-[52px] touch-manipulation",
        active
          ? "text-primary"
          : "text-muted-foreground"
      )}
      {...touchFeedbackProps}
      aria-label={`${label} - ${description}`}
    >
      <div className={cn(
        "p-1.5 rounded-lg transition-colors",
        active && "bg-primary/10"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[10px] font-medium leading-none",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </Link>
  );
}
