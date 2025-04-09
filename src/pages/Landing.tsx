
import React from 'react';
import { Header } from '@/components/Header';
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();
  
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
