
import { Heart } from "lucide-react";

interface LogoProps {
  onClick?: () => void;
  className?: string;
}

export const Logo = ({ onClick, className = "" }: LogoProps) => {
  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer no-underline ${className}`}
      onClick={onClick}
    >
      <div className="bg-primary/10 p-2 rounded-full">
        <Heart className="h-6 w-6 text-primary" />
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent no-underline">
        Doc' O Clock
      </span>
    </div>
  );
};
