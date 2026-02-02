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
      <img 
        src="/d0c-icon.svg" 
        alt="Doc' O Clock" 
        className="w-8 h-8 object-contain"
      />
      <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent no-underline">
        Doc' O Clock
      </span>
    </div>
  );
};
