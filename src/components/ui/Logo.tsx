
import { Link } from "react-router-dom";

export const Logo = () => {
  return (
    <Link to="/" className="text-xl font-bold flex items-center no-underline hover:no-underline">
      <div className="w-8 h-8 mr-2 bg-[#4CAF50] rounded-full flex items-center justify-center text-white font-bold">
        D0C
      </div>
      <span className="bg-gradient-to-r from-[#4CAF50] to-secondary bg-clip-text text-transparent animate-fadeIn no-underline">
        Doc&apos; O Clock
      </span>
    </Link>
  );
};
