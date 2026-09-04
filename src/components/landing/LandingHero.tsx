import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { ZAMBIAN_TESTIMONIALS } from "@/config/zambia";

const PARTNER_TABS = [
  { id: "uth", name: "UTH Lusaka", quote: 0 },
  { id: "cima", name: "CIMA", quote: 1 },
  { id: "moh", name: "Ministry of Health", quote: 5 },
  { id: "nhima", name: "NHIMA", quote: 3 },
  { id: "medland", name: "Medland", quote: 2 },
];

export const LandingHero = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activePartner, setActivePartner] = useState(0);

  const featured = ZAMBIAN_TESTIMONIALS[PARTNER_TABS[activePartner].quote];

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <section className="relative overflow-hidden bg-hero-wash bg-canvas">
      <div className="relative z-10 mx-auto max-w-content px-4 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8">
        <h1 className="mx-auto max-w-5xl font-display text-[2.75rem] font-medium leading-[1.05] tracking-tight text-midnight opacity-0 animate-hero-rise sm:text-6xl lg:text-[5rem]">
          Healthcare patients love.
          <br className="hidden sm:block" /> Care you can prove.
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed tracking-wide text-graphite-500 opacity-0 animate-hero-rise sm:text-lg"
          style={{ animationDelay: "0.12s" }}
        >
          Zambia&apos;s healthcare platform for booking verified doctors, encrypted video consults, NHIMA cover, digital prescriptions, and pharmacy delivery — from Lusaka to every province.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.2s" }}
        >
          <button type="button" onClick={() => navigate("/search")} className="vf-btn-primary">
            Get started
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => navigate("/video-dashboard")} className="vf-btn-secondary">
            Start a video consult
          </button>
        </div>

        <form
          onSubmit={onSearch}
          className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-pill border border-canvas-silk bg-white p-1.5 shadow-pill-nav opacity-0 animate-hero-rise"
          style={{ animationDelay: "0.28s" }}
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
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-midnight outline-none placeholder:text-graphite-400"
          />
          <button type="submit" className="vf-btn-primary !px-5 !py-2.5 shrink-0">
            Search
          </button>
        </form>
      </div>

      <div
        className="relative mx-auto mt-12 max-w-content px-4 opacity-0 animate-hero-rise sm:mt-16 sm:px-6 lg:px-8"
        style={{ animationDelay: "0.36s" }}
      >
        <div className="overflow-hidden rounded-card border border-canvas-silk bg-white shadow-card-hover">
          <div className="flex items-center gap-2 border-b border-canvas-silk bg-canvas-bone px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="h-2.5 w-2.5 rounded-full bg-canvas-silk" />
            <span className="ml-3 truncate text-[11px] font-medium text-graphite-400">
              doc0clock.online — live care
            </span>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=2000&q=85"
              alt="African healthcare professional in white coat consulting with patient - Doc' O Clock telemedicine platform"
              className="h-[38vh] w-full object-cover object-center sm:h-[48vh] lg:h-[54vh]"
              width={2000}
              height={1125}
              loading="eager"
            />
            <article className="absolute bottom-5 left-4 right-4 z-20 mx-auto max-w-sm rounded-card border border-white/70 bg-white/95 p-5 shadow-card-hover backdrop-blur-md sm:left-auto sm:right-6 sm:mx-0">
              <p className="font-display text-lg leading-snug text-midnight">
                &ldquo;{featured.content}&rdquo;
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-midnight">{featured.name}</p>
                  <p className="text-xs text-graphite-500">
                    {featured.role} · {featured.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/about")}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
                >
                  Patient stories <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className="mt-10 border-y border-canvas-silk bg-white">
        <div className="mx-auto grid max-w-content grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex items-center border-b border-canvas-silk px-5 py-4 text-left sm:border-b-0 lg:border-r">
            <p className="text-xs font-medium uppercase tracking-widest text-graphite-400">
              Patient stories
            </p>
          </div>
          {PARTNER_TABS.map((partner, i) => (
            <button
              key={partner.id}
              type="button"
              onClick={() => setActivePartner(i)}
              className={`flex items-center justify-center border-b border-canvas-silk px-4 py-4 text-sm font-medium transition-colors sm:border-b-0 lg:border-r lg:last:border-r-0 ${
                activePartner === i
                  ? "bg-midnight text-white"
                  : "text-graphite-600 hover:bg-canvas-bone hover:text-midnight"
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
