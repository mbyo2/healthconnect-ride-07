
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
    rippleOpacity: 0.15 
  });

  return (
    <Link 
      to={to}
      className={cn(
        "flex flex-1 flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 ease-out group relative overflow-hidden min-h-[56px] min-w-[56px] touch-manipulation",
        active 
          ? "text-trust-600 scale-105 shadow-lg" 
          : "text-muted-foreground hover:text-trust-500 hover:scale-105"
      )}
      {...touchFeedbackProps}
      aria-label={`${label} - ${description}`}
    >
      {/* Enhanced active indicator background */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-br from-trust-50 to-trust-100 rounded-xl animate-in fade-in duration-300 shadow-inner" />
      )}
      
      {/* Icon container with better spacing */}
      <div className={cn(
        "relative flex flex-col items-center justify-center space-y-1 transition-transform duration-200",
        active && "transform-gpu"
      )}>
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-200",
          active && "bg-trust-100/70 shadow-sm"
        )}>
          {icon}
        </div>
        
        {/* Enhanced label with better readability */}
        <span className={cn(
          "text-[10px] font-medium leading-tight tracking-tight text-center",
          active ? "text-trust-700" : "text-muted-foreground"
        )}>
          {label}
        </span>
        
        {/* Enhanced active indicator */}
        {active && (
          <div className="absolute -bottom-0.5 w-1.5 h-1.5 bg-trust-500 rounded-full animate-in zoom-in duration-200 shadow-sm" />
        )}
      </div>
    </Link>
  );
}
