
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
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-base", 
    lg: "w-12 h-12 text-xl"
  };
  
  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  };

  const LogoContent = () => (
    <div className={cn("flex items-center gap-2 no-underline", className)} onClick={onClick}>
      <div className={cn(
        "bg-trust-500 rounded-full flex items-center justify-center text-white font-bold shadow-sm",
        sizeClasses[size]
      )}>
        D0C
      </div>
      {showText && (
        <span className={cn(
          "font-bold bg-gradient-to-r from-trust-500 to-trust-600 bg-clip-text text-transparent no-underline",
          textSizeClasses[size]
        )}>
          Doc' O Clock
        </span>
      )}
    </div>
  );

  if (linkTo && !onClick) {
    return (
      <Link to={linkTo} className="hover:opacity-80 transition-opacity no-underline">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
};
