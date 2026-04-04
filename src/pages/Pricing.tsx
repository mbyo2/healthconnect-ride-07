import { PricingPage } from '@/components/subscription/PricingPage';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

const Pricing = () => {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Authenticated users get the global header via MobileLayout
  if (isAuthenticated) {
    return <PricingPage />;
  }

  // Unauthenticated users get the landing header
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader scrolled={scrolled} />
      <div className="pt-20">
        <PricingPage />
      </div>
      <LandingFooter />
    </div>
  );
};

export default Pricing;
