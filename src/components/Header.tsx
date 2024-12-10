import { Button } from "@/components/ui/button";
import { Bell, Menu, User } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">Dokotela</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-primary">Find Care</a>
            <a href="#" className="text-gray-600 hover:text-primary">Services</a>
            <a href="#" className="text-gray-600 hover:text-primary">About</a>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Sign In
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <a href="#" className="block text-gray-600 hover:text-primary">Find Care</a>
            <a href="#" className="block text-gray-600 hover:text-primary">Services</a>
            <a href="#" className="block text-gray-600 hover:text-primary">About</a>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sign In
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};