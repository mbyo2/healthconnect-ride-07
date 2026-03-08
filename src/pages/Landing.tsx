import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { HowItWorks, Features, ForProviders } from "@/components/landing/LandingFeatures";
import { Testimonials } from "@/components/landing/LandingTestimonials";
import { BrowseSpecialties, CTASection, LandingFooter } from "@/components/landing/LandingFooter";

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Doc' O Clock — Book Doctors & Healthcare in Zambia</title>
        <meta name="description" content="Zambia's trusted healthcare platform. Book appointments with verified doctors, order medications, access telemedicine, and manage your health — all in one place." />
        <meta property="og:title" content="Doc' O Clock — Healthcare at Your Fingertips" />
        <meta property="og:description" content="Book appointments, order medicine, and access emergency services anywhere in Zambia." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dococlockapp.com" />
        <meta property="og:image" content="/og-image.png" />
        <link rel="canonical" href="https://dococlockapp.com" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "name": "Doc' O Clock",
          "description": "Zambia's trusted healthcare platform",
          "url": "https://dococlockapp.com",
          "areaServed": { "@type": "Country", "name": "Zambia" },
          "serviceType": ["Telemedicine", "Medical Appointments", "Pharmacy Delivery"]
        })}</script>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <LandingHeader scrolled={scrolled} />
        <main>
          <LandingHero />
          <HowItWorks />
          <Features />
          <Testimonials />
          <ForProviders />
          <BrowseSpecialties />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
};

export default Landing;
