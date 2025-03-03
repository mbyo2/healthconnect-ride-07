
import React from "react";
import { Hero } from "@/components/Hero";
import { ServiceHighlights } from "@/components/ServiceHighlights";
import { Testimonials } from "@/components/Testimonials";
import { CtaSection } from "@/components/CtaSection";
import { Header } from "@/components/Header";

const Healthcare = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      <Header />
      <Hero />
      <ServiceHighlights />
      <Testimonials />
      <CtaSection />
    </div>
  );
};

export default Healthcare;
