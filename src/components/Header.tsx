import { Button } from "@/components/ui/button";
import { Bell, Menu, User } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-xl font-bold text-primary">Dokotela</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b shadow-lg">
          <nav className="px-4 py-2 space-y-2">
            <a href="#" className="block py-2 text-gray-600 hover:text-primary">Find Care</a>
            <a href="#" className="block py-2 text-gray-600 hover:text-primary">Services</a>
            <a href="#" className="block py-2 text-gray-600 hover:text-primary">About</a>
            <Button className="w-full flex items-center justify-center gap-2 mt-2">
              <User className="h-5 w-5" />
              Sign In
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};