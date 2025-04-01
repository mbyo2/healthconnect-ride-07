
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DesktopNavigation } from "./navigation/DesktopNavigation";
import { MobileNavigation } from "./navigation/MobileNavigation";
import { Logo } from "./ui/Logo";
import { HeaderControls } from "./navigation/HeaderControls";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? "bg-background/90 backdrop-blur-md shadow-sm" : "bg-background/50 backdrop-blur-sm"
    } border-b`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          
          {/* Desktop Navigation */}
          <DesktopNavigation />
          
          <HeaderControls 
            isMenuOpen={isMenuOpen} 
            setIsMenuOpen={setIsMenuOpen} 
            navigate={navigate} 
          />
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <MobileNavigation 
          setIsMenuOpen={setIsMenuOpen} 
          navigate={navigate}
        />
      )}
    </header>
  );
};
