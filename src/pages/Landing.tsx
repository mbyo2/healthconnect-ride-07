// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { CareExperience, HowItWorks, Features, ForProviders, PlatformScale } from "@/components/landing/LandingFeatures";
import { Testimonials } from "@/components/landing/LandingTestimonials";
import { BrowseSpecialties, CTASection, LandingFooter } from "@/components/landing/LandingFooter";

const SITE_URL = "https://doc0clock.online";
const SITE_NAME = "Doc' O Clock";
const DEFAULT_TITLE = "Doc' O Clock — Book Doctors & Video Consultations in Zambia";
const DEFAULT_DESCRIPTION =
  "Connect with verified doctors across Zambia. Book appointments, attend video consultations, receive digital prescriptions, and order medications for delivery. Healthcare that works for everyone.";

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "MedicalService",
    name: "Doc' O Clock Healthcare Services",
    description: "Comprehensive healthcare services including telemedicine, doctor consultations, and pharmacy delivery across Zambia.",
    provider: {
      "@type": "MedicalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    serviceType: [
      "Telemedicine",
      "Medical Consultations",
      "Pharmacy Services",
      "Digital Prescriptions",
      "Emergency Care Coordination",
    ],
    areaServed: {
      "@type": "Country",
      name: "Zambia",
    },
    url: SITE_URL,
  };

  return (
    <>
      <Helmet>
        <html lang="en-ZM" />
        <title>{DEFAULT_TITLE}</title>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <meta
          name="keywords"
          content="Doc O Clock, Doc0Clock, Zambia healthcare, doctor booking Zambia, telemedicine Zambia, video consultation Lusaka, online pharmacy Zambia, digital prescriptions, NHIMA, medical appointments, health platform Zambia, UTH"
        />
        <meta name="author" content="Doc' O Clock" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="theme-color" content="#397dff" />
        <meta name="geo.region" content="ZM" />
        <meta name="geo.placename" content="Zambia" />
        <link rel="canonical" href={`${SITE_URL}/`} />
        {/* Hero photo is same-origin: preload it so first paint is instant. */}
        <link rel="preload" as="image" href="/images/landing/hero-1600.jpg" fetchpriority="high" />

        <meta property="og:title" content="Doc' O Clock — Healthcare Platform for Zambia" />
        <meta property="og:description" content="Connect with verified doctors, book appointments, attend video consultations, and order medications — all in one platform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="Doc' O Clock — Zambia healthcare platform for booking doctors, video consults, and pharmacy" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_ZM" />
        <meta property="og:locale:alternate" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Doc' O Clock — Healthcare Platform for Zambia" />
        <meta name="twitter:description" content="Connect with verified doctors, book appointments, attend video consultations, and order medications." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:image:alt" content="Doc' O Clock healthcare platform for Zambia" />

        {/* Only MedicalService lives here — MedicalOrganization / WebSite /
            SoftwareApplication / FAQPage are owned by index.html. Two copies
            of the same entity (or two FAQPage blocks) make Google drop them. */}
        <script type="application/ld+json">{JSON.stringify(serviceLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-canvas text-midnight font-sans antialiased">
        <LandingHeader scrolled={scrolled} />
        <main id="main-content">
          <LandingHero />
          {/* Symptom entry — routes into the AI Triage & Care Assistant.
              Chips only preselect a body area / symptom on /triage; no
              symptom text is collected or sent anywhere on this page. */}
          <section className="px-4 sm:px-6 py-10 bg-white dark:bg-slate-900 border-y border-canvas-silk dark:border-slate-800">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-primary-500" /> Not sure who to see?
              </h2>
              <p className="text-sm text-graphite-500 dark:text-slate-400 font-medium">
                Answer a few symptom questions and Doc&apos;O Clock will point you to the
                right professional — a dentist for a toothache, a midwife for antenatal
                care, a doctor for the rest. It takes about a minute, and nothing you
                enter is saved.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { label: "Fever", area: "general", s: "Fever" },
                  { label: "Toothache", area: "teeth-mouth", s: "Tooth pain" },
                  { label: "Skin rash", area: "skin", s: "Rash" },
                  { label: "Back pain", area: "back-joints", s: "Back pain" },
                  { label: "Stomach pain", area: "stomach-digestion", s: "Stomach pain" },
                  { label: "Anxiety & stress", area: "mind-mood", s: "" },
                  { label: "Child health", area: "child-health", s: "" },
                  { label: "Eye problem", area: "eyes-vision", s: "" },
                ].map((chip) => (
                  <Link
                    key={chip.label}
                    to={`/triage?area=${chip.area}${chip.s ? `&s=${encodeURIComponent(chip.s)}` : ""}`}
                    className="px-3.5 py-2 rounded-full border border-graphite-300 dark:border-slate-700 text-xs font-semibold hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-all"
                  >
                    {chip.label}
                  </Link>
                ))}
              </div>
              <Link
                to="/triage"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-all active:scale-[0.99]"
              >
                Check my symptoms <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
          <HowItWorks />
          <PlatformScale />
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
