import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { CareExperience, HowItWorks, Features, ForProviders, PlatformScale } from "@/components/landing/LandingFeatures";
import { Testimonials } from "@/components/landing/LandingTestimonials";
import { BrowseSpecialties, CTASection, LandingFooter } from "@/components/landing/LandingFooter";

const SITE_URL = "https://doc0clock.online";
const SITE_NAME = "Doc' O Clock";
const DEFAULT_TITLE = "Doc' O Clock — Zambia's #1 Healthcare Platform | Book Doctors, Video Consultations & Pharmacy";
const DEFAULT_DESCRIPTION =
  "Connect with verified doctors across Zambia. Book appointments, attend video consultations, receive digital prescriptions, and order medications for delivery. Healthcare that works for everyone.";

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: SITE_NAME,
    alternateName: ["Doc O Clock", "Doc0Clock", "HealthConnect"],
    description: "Zambia's leading healthcare platform connecting patients with verified doctors, pharmacies, and hospitals.",
    url: SITE_URL,
    logo: `${SITE_URL}/logo192.png`,
    image: `${SITE_URL}/og-image.png`,
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "ZM",
        addressLocality: "Lusaka",
      },
    },
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      areaServed: "ZM",
      availableLanguage: ["English"],
      url: `${SITE_URL}/contact`,
    },
    areaServed: {
      "@type": "Country",
      name: "Zambia",
    },
    medicalSpecialty: [
      "GeneralPractice",
      "Cardiology",
      "Dentistry",
      "Pediatrics",
      "Emergency",
    ],
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-ZM",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo192.png`,
      },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": {
        "@type": "PropertyValueSpecification",
        valueRequired: true,
        valueName: "search_term_string",
      },
    },
  };

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web, iOS, Android",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "ZMW",
      description: "Free for patients to book appointments and access telemedicine",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "50000",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Doctor booking",
      "Video consultations",
      "Digital prescriptions",
      "Pharmacy delivery",
      "NHIMA insurance",
      "Emergency triage",
    ],
  };

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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I book a doctor on Doc' O Clock?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Search verified doctors by specialty, hospital, city, or NHIMA cover, choose an available slot, and confirm. You can visit in clinic or join an encrypted video consultation.",
        },
      },
      {
        "@type": "Question",
        name: "Does Doc' O Clock accept NHIMA in Zambia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Doc' O Clock supports NHIMA eligibility checks and digital claims alongside private insurance so covered consultations and prescriptions can be processed without paper queues.",
        },
      },
      {
        "@type": "Question",
        name: "Can I get a video consultation from anywhere in Zambia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Encrypted HD video consults are available nationwide, including Lusaka, Copperbelt, Livingstone, and other provinces, with digital prescriptions sent to your phone.",
        },
      },
      {
        "@type": "Question",
        name: "How does pharmacy delivery work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After a doctor issues an e-prescription, licensed pharmacies on Doc' O Clock can fulfil genuine medicines for pickup or doorstep delivery.",
        },
      },
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Find Doctors", item: `${SITE_URL}/search` },
    ],
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

        <meta property="og:title" content="Doc' O Clock — Zambia's #1 Healthcare Platform" />
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
        <meta name="twitter:title" content="Doc' O Clock — Zambia's #1 Healthcare Platform" />
        <meta name="twitter:description" content="Connect with verified doctors, book appointments, attend video consultations, and order medications." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:image:alt" content="Doc' O Clock healthcare platform for Zambia" />

        <script type="application/ld+json">{JSON.stringify(organizationLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteLd)}</script>
        <script type="application/ld+json">{JSON.stringify(softwareLd)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-canvas text-midnight font-sans antialiased">
        <LandingHeader scrolled={scrolled} />
        <main id="main-content">
          <LandingHero />
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
