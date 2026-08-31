import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { CareExperience, HowItWorks, Features, ForProviders } from "@/components/landing/LandingFeatures";
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
        <title>Doc' O Clock — Connect with Your Doctor Anytime, Anywhere</title>
        <meta
          name="description"
          content="Zambia's #1 healthcare app. Connect with verified doctors, book clinic visits, attend video consultations, receive digital prescriptions, and order medications — all in one app."
        />
        <meta property="og:title" content="Doc' O Clock — Connect with Your Doctor Anytime, Anywhere" />
        <meta
          property="og:description"
          content="Book appointments with verified doctors, order medicine, and access healthcare anywhere in Zambia."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://doc0clock.online" />
        <meta property="og:image" content="/og-image.png" />
        <link rel="canonical" href="https://doc0clock.online" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            "name": "Doc' O Clock",
            "description": "Zambia's trusted healthcare and doctor booking platform",
            "url": "https://doc0clock.online",
            "areaServed": { "@type": "Country", "name": "Zambia" },
            "serviceType": ["Telemedicine", "Medical Appointments", "Pharmacy Delivery", "Doctor Consultations"],
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-slate-950 text-white font-sans transition-colors">
        <LandingHeader scrolled={scrolled} />
        <main>
          <LandingHero />
          <HowItWorks />
          <CareExperience />
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
