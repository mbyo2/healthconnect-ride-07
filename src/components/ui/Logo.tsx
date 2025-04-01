
import { Link } from "react-router-dom";

export const Logo = () => {
  return (
    <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeIn">
      Dokotela
    </Link>
  );
};
