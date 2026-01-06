
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  linkTo?: string;
}

export const AppLogo = ({
  size = "md",
  showText = true,
  className = "",
  onClick,
  linkTo = "/"
}: AppLogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  const LogoContent = () => (
    <div className={cn("flex items-center gap-2", className)} onClick={onClick}>
      <img 
        src="/d0c-icon.svg" 
        alt="Doc' O Clock" 
        className={cn("object-contain", sizeClasses[size])}
        onError={(e) => {
          // Fallback if SVG fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = "bg-primary rounded-full flex items-center justify-center text-white font-bold";
            fallback.style.width = sizeClasses[size].split(' ')[0].replace('w-', '') + 'px';
            fallback.style.height = sizeClasses[size].split(' ')[1].replace('h-', '') + 'px';
            fallback.innerText = "D0C";
            parent.prepend(fallback);
          }
        }}
      />
      {showText && (
        <span className={cn(
          "font-bold text-foreground whitespace-nowrap tracking-tight",
          textSizeClasses[size]
        )}>
          Doc&apos; O Clock
        </span>
      )}
    </div>
  );

  if (linkTo && !onClick) {
    return (
      <Link to={linkTo} className="hover:opacity-80 transition-opacity">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};
