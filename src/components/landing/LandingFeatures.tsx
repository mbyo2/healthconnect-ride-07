import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Pill, ShieldCheck, HeartPulse,
  CheckCircle, ArrowRight, ChevronRight, Stethoscope,
  Sparkles, Building2, Activity, CheckCircle2, MapPin
} from "lucide-react";
import { LANDING_PHOTOS, unsplash, unsplashSrcSet } from "./landingPhotos";

export const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-white">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {[
            {
              title: "Book.",
              desc: "Find verified doctors by specialty, hospital, NHIMA cover, or city — and lock a slot in seconds.",
              route: "/search",
              photo: LANDING_PHOTOS.bookStep,
              alt: "Illustrative photo: an African doctor booking an appointment on a phone — Doc' O Clock",
            },
            {
              title: "Consult.",
              desc: "Join an encrypted video visit from home or walk into clinic without the queue. Same record either way.",
              route: "/video-dashboard",
              photo: LANDING_PHOTOS.consultStep,
              alt: "Illustrative photo: a doctor on a laptop with a stethoscope — Doc' O Clock video consultations",
            },
            {
              title: "Continue.",
              desc: "Digital prescriptions land on your phone and nearby pharmacies fulfil them for pickup or delivery.",
              route: "/prescriptions",
              photo: LANDING_PHOTOS.pharmacyStep,
              alt: "Illustrative photo: prescribed medicines ready for pharmacy fulfilment — Doc' O Clock",
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => navigate(item.route)}
              className="group text-left"
            >
              <span className="block overflow-hidden rounded-card border border-canvas-silk shadow-card">
                <img
                  src={unsplash(item.photo, 800)}
                  srcSet={unsplashSrcSet(item.photo, [400, 800, 1200])}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt={item.alt}
                  className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={500}
                />
              </span>
              <h2 className="mt-6 font-display text-4xl font-medium tracking-tight text-midnight sm:text-5xl">
                {item.title}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed tracking-wide text-graphite-500 dark:text-slate-400 sm:text-base">
                {item.desc}
              </p>
              <span className="mt-5 inline-flex items-center text-sm font-medium text-primary-500 group-hover:gap-2">
                Learn more <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const PlatformScale = () => (
  <section className="vf-section relative overflow-hidden border-t border-canvas-silk">
    {/* Full-bleed photographic band — the "different colour" in the Apple-like rhythm. */}
    <div className="absolute inset-0" aria-hidden>
      <img
        src={unsplash(LANDING_PHOTOS.scaleBand, 1600)}
        srcSet={unsplashSrcSet(LANDING_PHOTOS.scaleBand, [800, 1200, 1600, 2000])}
        sizes="100vw"
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-midnight/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-midnight/40 via-transparent to-midnight/40" />
    </div>
    <div className="relative mx-auto max-w-content px-4 sm:px-6 lg:px-8">
      <h2 className="mx-auto max-w-3xl text-center font-display text-3xl font-medium tracking-tight text-white sm:text-5xl">
        Built for everyday care. Ready for Zambia at scale.
      </h2>
      <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-10">
        {[
          { value: "20+", unit: "specialties", label: "Clinical specialties covered" },
          { value: "Video", unit: "visits", label: "Consult from anywhere" },
          { value: "10", unit: "provinces", label: "Built for all of Zambia" },
          { value: "24/7", unit: "access", label: "Emergency & bookings" },
        ].map((stat) => (
          <div key={stat.label} className="text-center lg:text-left">
            <div className="font-display text-4xl font-medium tracking-tight text-white sm:text-5xl">
              {stat.value}
              <span className="ml-1 text-xl text-white/60 sm:text-2xl">{stat.unit}</span>
            </div>
            <p className="mt-2 text-sm text-white/70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const CareExperience = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-canvas-bone border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="vf-eyebrow">
              <HeartPulse className="h-3.5 w-3.5 text-accent-500" />
              Complete Healthcare Ecosystem
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight leading-[1.15]">
              Care that fits into{" "}
              <span className="text-primary-500">your everyday life.</span>
            </h2>
            <p className="text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">
              Doc&apos; O Clock brings doctors, pharmacies, labs, and hospitals together in one intuitive experience. Get care in minutes, anywhere in Zambia.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {[
                { badge: "24/7 Access", title: "Video Telehealth", desc: "Connect with certified doctors in under 15 minutes, any time.", route: "/video-dashboard" },
                { badge: "Doorstep", title: "Pharmacy Delivery", desc: "Order genuine prescribed medications delivered to your home.", route: "/search?type=pharmacy" },
                { badge: "NHIMA", title: "Insurance Accepted", desc: "Zero-hassle digital claims and instant insurance verification.", route: "/pricing" },
                { badge: "Emergency", title: "24/7 Emergency & ER", desc: "One-tap emergency dispatch and hospital bed reservation.", route: "/emergency" },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="vf-card !p-4 text-left cursor-pointer group"
                >
                  <span className="inline-block px-2.5 py-0.5 rounded-pill text-[10px] font-medium mb-2 bg-primary-50 text-primary-600 border border-primary-100">
                    {item.badge}
                  </span>
                  <div className="font-medium text-sm text-midnight group-hover:text-primary-500 transition-colors">{item.title}</div>
                  <div className="text-xs text-graphite-500 dark:text-slate-400 mt-1 leading-snug tracking-wide">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-canvas-silk bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card overflow-hidden">
            <div className="rounded-2xl overflow-hidden relative">
              <img
                src={unsplash("photo-1594824476967-48c8b964273f", 900)}
                srcSet={unsplashSrcSet("photo-1594824476967-48c8b964273f", [480, 768, 1200])}
                sizes="(max-width: 1024px) 100vw, 50vw"
                alt="Illustrative photo: a doctor in a video consultation - Doc' O Clock telemedicine"
                className="h-64 sm:h-80 w-full object-cover"
                loading="lazy"
                decoding="async"
                width={1200}
                height={800}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-midnight/80 to-transparent">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm text-white">Video consultations</div>
                    <div className="text-[11px] text-white/70">Connect with a certified doctor in minutes</div>
                  </div>
                  <button
                    onClick={() => navigate("/video-dashboard")}
                    className="px-3.5 py-1.5 rounded-pill text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 shrink-0"
                  >
                    Start a visit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Features = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      tab: "Doctor Consultations",
      icon: Stethoscope,
      title: "Book verified doctors & specialists",
      desc: "Browse certified practitioners across 20+ specialties. View hospital credentials, available slots and book in seconds.",
      metrics: ["Verified Doctors", "Zero Booking Fees", "Instant Confirmations"],
      badge: "Top Rated",
      preview: (
        <div className="space-y-2.5">
          {[
            { name: "Sample Doctor", spec: "Cardiology · Video & clinic visits", note: "Sample preview" },
            { name: "Sample Doctor", spec: "Emergency · Video visits", note: "Sample preview" },
            { name: "Sample Doctor", spec: "General Medicine · Clinic visits", note: "Sample preview" },
          ].map((d, i) => (
            <div key={`${d.spec}-${i}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-canvas-bone border border-canvas-silk">
              <div>
                <div className="font-medium text-sm text-midnight">{d.name}</div>
                <div className="text-[11px] text-graphite-500 dark:text-slate-400">{d.spec}</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-graphite-400 font-medium">{d.note}</span>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "E-Prescriptions",
      icon: Pill,
      title: "Digital prescriptions & pharmacy delivery",
      desc: "Doctors generate secure e-prescriptions sent instantly to your Doc' O Clock app. Fulfill medications from licensed pharmacies with doorstep delivery.",
      metrics: ["Direct Pharmacy Routing", "100% Genuine Medicines", "Doorstep Delivery"],
      badge: "Fast Dispense",
      preview: (
        <div className="space-y-2.5">
          {[
            { med: "Amoxicillin 500mg (20 Caps)", doc: "Sample prescription · Out for Delivery", status: "Out for Delivery" },
            { med: "Metformin 500mg (60 Tabs)", doc: "Sample prescription · Ready for Pickup", status: "Ready for Pickup" },
          ].map((p) => (
            <div key={p.med} className="p-3.5 rounded-2xl bg-canvas-bone border border-canvas-silk space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-midnight">{p.med}</span>
                <span className="px-2 py-0.5 rounded-pill text-[10px] font-medium bg-success-50 text-success-500">{p.status}</span>
              </div>
              <div className="text-[11px] text-graphite-500 dark:text-slate-400">{p.doc}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "NHIMA Insurance",
      icon: ShieldCheck,
      title: "Seamless NHIMA & private insurance coverage",
      desc: "Doc' O Clock integrates directly with NHIMA and private insurers. Access covered consultations, lab tests and hospital care without out-of-pocket stress.",
      metrics: ["Instant Eligibility Check", "Zero Paper Claims", "NHIMA Network"],
      badge: "Insurance Ready",
      preview: (
        <div className="p-4 rounded-2xl bg-canvas-bone border border-canvas-silk space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-canvas-silk">
            <span className="text-xs font-medium text-midnight">NHIMA Insurance Card #8829104</span>
            <span className="px-2 py-0.5 rounded-pill text-[10px] font-medium bg-success-50 text-success-500">ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-graphite-400 block">Consultation Co-pay</span>
              <span className="font-medium text-success-500">100% Covered (K0)</span>
            </div>
            <div>
              <span className="text-[10px] text-graphite-400 block">Prescription Benefit</span>
              <span className="font-medium text-success-500">Full Coverage</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      tab: "Emergency & ER",
      icon: HeartPulse,
      title: "24/7 emergency ambulance & bed finder",
      desc: "In emergencies every second counts. Find the nearest open ICU hospital, track ambulance ETA, and alert physicians before you arrive.",
      metrics: ["991 Emergency Dispatch", "Real-Time Bed Occupancy", "Trauma Ready"],
      badge: "24/7 Emergency",
      preview: (
        <div className="space-y-2.5">
          {[
            { hospital: "Sample Referral Hospital", er: "Trauma care · Sample preview", dist: "2.4 km" },
            { hospital: "Sample Emergency Centre", er: "24/7 Emergency Room · Sample preview", dist: "4.1 km" },
          ].map((h) => (
            <div key={h.hospital} className="p-3 rounded-2xl bg-canvas-bone border border-canvas-silk flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-midnight">{h.hospital}</div>
                <div className="text-[10px] text-accent-600 font-medium">{h.er}</div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-graphite-400 shrink-0">
                <MapPin className="h-3 w-3" /> {h.dist}
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const active = features[activeFeature];

  return (
    <section className="vf-section bg-primary-50 dark:bg-slate-900 border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="vf-eyebrow mb-5">
            <Sparkles className="h-3.5 w-3.5 text-accent-500" />
            Doc&apos; O Clock Core Features
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight">
            Modern healthcare, designed around you.
          </h2>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <button
              key={f.tab}
              type="button"
              onClick={() => setActiveFeature(i)}
              className={`vf-card !p-5 text-left ${
                activeFeature === i ? "ring-2 ring-primary-500/30 border-primary-200" : ""
              }`}
            >
              <f.icon className="mb-3 h-5 w-5 text-primary-500" />
              <div className="text-sm font-medium text-midnight">{f.tab}</div>
              <p className="mt-1 text-xs leading-relaxed text-graphite-500 dark:text-slate-400">{f.badge}</p>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center rounded-card bg-canvas-bone border border-canvas-silk p-6 sm:p-10">
          <div className="space-y-5">
            <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium bg-primary-50 text-primary-600 border border-primary-100">
              {active.badge}
            </span>
            <h3 className="font-display text-2xl sm:text-4xl font-light text-midnight leading-tight">{active.title}</h3>
            <p className="text-sm sm:text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">{active.desc}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {active.metrics.map((m) => (
                <span key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-700 text-xs font-medium text-graphite-700 dark:text-slate-200">
                  <CheckCircle className="h-3.5 w-3.5 text-success-500" />
                  {m}
                </span>
              ))}
            </div>
            <button onClick={() => navigate("/search")} className="vf-btn-primary">
              Find Doctors Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 rounded-card bg-white dark:bg-slate-900 border border-canvas-silk shadow-card">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-canvas-mist">
              <div className="flex items-center gap-2">
                <active.icon className="h-4 w-4 text-primary-500" />
                <span className="text-xs font-medium text-graphite-700">{active.tab} Preview</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-pill text-[10px] font-medium bg-primary-50 text-primary-600">
                {active.badge}
              </span>
            </div>
            {active.preview}
          </div>
        </div>
      </div>
    </section>
  );
};

export const ForProviders = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-canvas-bone border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="vf-eyebrow">
              <Building2 className="h-3.5 w-3.5 text-accent-500" />
              For Doctors, Clinics & Hospitals
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-medium text-midnight tracking-tight leading-tight">
              Grow your medical practice{" "}
              <span className="text-primary-500">with Doc&apos; O Clock.</span>
            </h2>
            <p className="text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">
              Join hundreds of practitioners and institutions reaching thousands of patients daily across Zambia. Manage bookings, telehealth, e-prescriptions, and NHIMA billing in one place.
            </p>
            <div className="space-y-3 pt-1">
              {[
                { title: "Zero Setup Cost", desc: "Create your verified doctor profile and start accepting bookings today." },
                { title: "HD Video Telehealth Suite", desc: "Consult patients remotely with encrypted video and automated notes." },
                { title: "Digital Prescription & EMR", desc: "Send digital scripts straight to pharmacies and manage patient records securely." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3.5 p-4 rounded-card bg-white dark:bg-slate-900 border border-canvas-silk">
                  <CheckCircle2 className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-midnight">{item.title}</div>
                    <div className="text-xs text-graphite-500 dark:text-slate-400 mt-0.5 tracking-wide">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button onClick={() => navigate("/auth?tab=signup")} className="vf-btn-primary">
                Join as Healthcare Provider <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate("/pricing")} className="vf-btn-secondary">
                View Plans
              </button>
            </div>
          </div>

          <div className="rounded-card border border-canvas-silk bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-5">
            <div className="overflow-hidden rounded-2xl -mx-0">
              <img
                src={unsplash(LANDING_PHOTOS.providers, 900)}
                srcSet={unsplashSrcSet(LANDING_PHOTOS.providers, [480, 768, 1200])}
                sizes="(max-width: 1024px) 100vw, 50vw"
                alt="Illustrative photo: an African doctor reviewing a patient scan with a colleague — Doc' O Clock for providers"
                className="aspect-[16/9] w-full object-cover"
                loading="lazy"
                decoding="async"
                width={1200}
                height={675}
              />
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-canvas-mist">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-500" />
                <h3 className="font-display text-xl text-midnight">Practitioner Overview</h3>
              </div>
              <span className="px-3 py-1 rounded-pill text-[10px] font-medium text-white bg-success-500">Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { label: "Visit Types", value: "Video + Clinic", sub: "In-person or remote" },
                { label: "Records", value: "Digital", sub: "History in one place" },
                { label: "Booking", value: "Seconds", sub: "Direct from phone" },
                { label: "Coverage", value: "Nationwide", sub: "All of Zambia" },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-card bg-canvas-bone border border-canvas-silk">
                  <div className="text-[11px] text-graphite-400 font-medium uppercase tracking-wider">{m.label}</div>
                  <div className="text-2xl font-display font-light text-primary-500 mt-1">{m.value}</div>
                  <div className="text-[10px] text-graphite-500 dark:text-slate-400 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
