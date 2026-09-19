import { Helmet } from 'react-helmet-async';
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

  const seo = (
    <Helmet>
      <title>Pricing | Doc' O Clock Zambia</title>
      <meta
        name="description"
        content="Transparent pricing for consultations, video visits, and pharmacy delivery across Zambia. Free to join — pay per visit or via NHIMA and insurance."
      />
      <link rel="canonical" href="https://doc0clock.online/pricing" />
    </Helmet>
  );

  // Authenticated users get the global header via MobileLayout
  if (isAuthenticated) {
    return (
      <>
        {seo}
        <PricingPage />
      </>
    );
  }

  // Unauthenticated users get the landing header
  return (
    <div className="min-h-screen bg-background">
      {seo}
      <LandingHeader scrolled={scrolled} />
      <div className="pt-20">
        <PricingPage />
      </div>
      <LandingFooter />
    </div>
  );
};

export default Pricing;
