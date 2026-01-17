import { Link } from "react-router-dom";

export const Logo = () => {
  return (
    <Link to="/" className="text-xl font-bold flex items-center no-underline hover:no-underline">
      <img 
        src="/d0c-icon.svg" 
        alt="Doc' O Clock" 
        className="w-8 h-8 mr-2 object-contain"
      />
      <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent animate-fadeIn no-underline">
        Doc&apos; O Clock
      </span>
    </Link>
  );
};
