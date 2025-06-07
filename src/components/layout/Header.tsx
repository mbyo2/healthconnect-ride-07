
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { HeaderControls } from '../navigation/HeaderControls';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { DesktopNavigation } from '../navigation/DesktopNavigation';
import { RoleSwitcher } from '../auth/RoleSwitcher';
import { useAuth } from '@/context/AuthContext';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="logo-link" onClick={() => navigate('/')}>
            <Logo />
          </div>
          <DesktopNavigation />
        </div>
        
        <div className="flex items-center gap-2">
          {isAuthenticated && <RoleSwitcher />}
          <HeaderControls 
            isMenuOpen={isMenuOpen} 
            setIsMenuOpen={setIsMenuOpen} 
            navigate={navigate} 
          />
        </div>
      </div>

      {isMenuOpen && (
        <MobileNavigation setIsMenuOpen={setIsMenuOpen} navigate={navigate} />
      )}
    </header>
  );
};
