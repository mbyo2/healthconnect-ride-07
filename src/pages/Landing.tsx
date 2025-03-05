
import React from 'react';
import { Header } from '@/components/Header';
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted pb-20 md:pb-0">
      <Header />
      <main className="pt-16">
        <Hero />
        <ServiceHighlights />
        <Testimonials />
        <CtaSection />
      </main>
    </div>
  );
};

export default Landing;
