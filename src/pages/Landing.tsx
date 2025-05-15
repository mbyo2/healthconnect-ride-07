
import React, { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDeviceType } from "@/hooks/use-device-type";

const Landing = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDeviceType();
  
  // Redirect to auth page on mobile or tablet
  useEffect(() => {
    if (isMobile || isTablet) {
      navigate('/auth');
    }
  }, [isMobile, isTablet, navigate]);
  
  // If on mobile or tablet, don't render the landing page content
  if (isMobile || isTablet) {
    return null; // Return nothing while redirecting
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Doc&apos; O Clock</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/login')}>Log In</Button>
          <Button onClick={() => navigate('/auth')}>Sign Up</Button>
        </div>
      </div>
      <main>
        <Hero />
        <ServiceHighlights />
        <Testimonials />
        <CtaSection />
      </main>
    </div>
  );
};

export default Landing;
