// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";

import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";
import { unsplash, unsplashSrcSet } from "./landingPhotos";
import { LandingImg } from "./LandingImg";

// Care topics framing the illustrative stories below — not partner endorsements.
const STORY_TABS = [
  { id: "appointments", name: "Appointments", quote: 0 },
  { id: "providers", name: "Providers", quote: 1 },
  { id: "specialists", name: "Specialists", quote: 5 },
  { id: "pharmacy", name: "Pharmacy", quote: 3 },
  { id: "emergency", name: "Emergency", quote: 2 },
];

// Popular searches — every chip deep-links to a /search URL param that
// SearchPage actually handles (q, category, specialty, mode). There is no
// insurance param, so no NHIMA chip: it would land on an unfiltered list.
const POPULAR_SEARCHES = [
  { label: "Video visits", href: "/search?mode=online" },
  { label: "Cardiology", href: "/search?specialty=Cardiology" },
  { label: "Pediatrics", href: "/search?specialty=Pediatrics" },
  { label: "General Practice", href: "/search?specialty=General+Practice" },
];

export const LandingHero = () => {
  const navigate = useNavigate();
  const stats = usePlatformStats();
  const [query, setQuery] = useState("");
  const [activePartner, setActivePartner] = useState(0);

  const featured = ZAMBIAN_TESTIMONIALS[STORY_TABS[activePartner].quote];

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <section className="relative overflow-hidden bg-hero-wash bg-canvas">
      <div className="relative z-10 mx-auto max-w-content px-4 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8">
        <h1 className="mx-auto max-w-5xl font-display text-[2.75rem] font-medium leading-[1.05] tracking-tight text-midnight opacity-0 animate-hero-rise sm:text-6xl lg:text-[5rem]">
          Book a verified doctor in Zambia — in person or by video.
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed tracking-wide text-graphite-500 dark:text-slate-400 opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.12s" }}
        >
          Zambia&apos;s healthcare platform for booking verified doctors, encrypted video consults, NHIMA cover, digital prescriptions, and pharmacy delivery — from Lusaka to every province.
        </p>

        <form
          onSubmit={onSearch}
          className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-pill border border-canvas-silk bg-white dark:bg-slate-900 p-1.5 shadow-pill-nav opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.2s" }}
          role="search"
        >
          <Search className="ml-3 h-4 w-4 shrink-0 text-graphite-400" aria-hidden />
          <label htmlFor="hero-search" className="sr-only">
            Search doctors, specialties, or pharmacies
          </label>
          <input
            id="hero-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctors, specialties, or pharmacies"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-midnight outline-none placeholder:text-graphite-400"
          />
          <button type="submit" className="vf-btn-primary !px-5 !py-3 shrink-0">
            Find a doctor
          </button>
        </form>

        <p
          className="mx-auto mt-5 max-w-xl text-sm font-medium text-graphite-600 dark:text-slate-300 opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.24s" }}
        >
          {stats.doctors > 0 ? `${formatStat(stats.doctors)} verified practitioners` : "Verified HPCZ-registered practitioners"}
          {" · "}
          {stats.hospitals > 0 ? `${formatStat(stats.hospitals)} facilities` : "Clinics & hospitals nationwide"}
          {" · NHIMA accepted"}
        </p>

        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-2 opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.28s" }}
        >
          <span className="text-xs font-medium text-graphite-400">Popular:</span>
          {POPULAR_SEARCHES.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => navigate(chip.href)}
              className="px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-pill border border-canvas-silk bg-white dark:bg-slate-900 text-xs font-medium text-graphite-600 dark:text-slate-300 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <p
          className="mt-4 opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.32s" }}
        >
          <button
            type="button"
            onClick={() => navigate("/pricing")}
            className="text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline"
          >
            See transparent pricing
          </button>
        </p>
      </div>

      <div
        className="relative mx-auto mt-12 max-w-content px-4 opacity-0 animate-hero-rise sm:mt-16 sm:px-6 lg:px-8"
        style={{ animationDelay: "0.36s" }}
      >
        <div className="overflow-hidden rounded-card border border-canvas-silk bg-white dark:bg-slate-900 shadow-card-hover">
          <div className="flex items-center gap-2 border-b border-canvas-silk bg-canvas-bone px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="ml-3 truncate text-xs font-medium text-graphite-400">
              doc0clock.online — live care
            </span>
          </div>
          <div className="relative">
            <LandingImg
              src={unsplash("photo-1581594693702-fbdc51b2763b", 1600)}
              srcSet={unsplashSrcSet("photo-1581594693702-fbdc51b2763b", [640, 960, 1280, 1600, 2000])}
              sizes="100vw"
              alt="Black African female doctor attending to patient - Doc' O Clock live care consultation platform"
              className="h-[38vh] w-full object-cover object-center sm:h-[48vh] lg:h-[54vh]"
              width={2000}
              height={1125}
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
            <article className="relative z-20 mx-4 mt-4 max-w-sm rounded-card border border-canvas-silk bg-white/95 p-5 shadow-card-hover backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 sm:absolute sm:bottom-5 sm:left-auto sm:right-6 sm:mx-0 sm:mt-0 sm:border-white/70">
              <span className="mb-3 inline-block px-2.5 py-0.5 rounded-pill text-xs font-medium bg-success-50 text-success-500">
                Illustrative story
              </span>
              <p className="font-display text-base leading-snug text-midnight">
                &ldquo;{featured.content}&rdquo;
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-midnight">{featured.name}</p>
                  <p className="text-xs text-graphite-500 dark:text-slate-400">
                    {featured.role} · {featured.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/about")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600"
                >
                  Patient stories <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className="mt-10 border-y border-canvas-silk dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="mx-auto grid max-w-content grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex items-center border-b border-canvas-silk px-5 py-4 text-left sm:border-b-0 lg:border-r">
            <p className="text-xs font-medium uppercase tracking-widest text-graphite-400">
              Patient stories
            </p>
          </div>
          {STORY_TABS.map((partner, i) => (
            <button
              key={partner.id}
              type="button"
              onClick={() => setActivePartner(i)}
              className={`flex items-center justify-center border-b border-canvas-silk px-4 py-4 text-sm font-medium transition-colors sm:border-b-0 lg:border-r lg:last:border-r-0 ${
                activePartner === i
                  ? "bg-midnight text-white"
                  : "text-graphite-600 dark:text-slate-300 hover:bg-canvas-bone hover:text-midnight"
              }`}
            >
              {partner.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
