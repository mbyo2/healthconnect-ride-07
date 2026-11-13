import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Pill, ShieldCheck, HeartPulse,
  CheckCircle, ArrowRight, ChevronRight, Stethoscope,
  Building2, Activity, CheckCircle2
} from "lucide-react";
import { LANDING_PHOTOS, unsplash, unsplashSrcSet } from "./landingPhotos";
import { usePlatformStats, formatStat } from "@/hooks/usePlatformStats";
import { LandingImg } from "./LandingImg";

export const HowItWorks = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-midnight text-center mb-12">
          How Doc&apos; O Clock works
        </h2>
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          {[
            {
              title: "Book.",
              desc: "Find verified doctors by specialty, hospital, NHIMA cover, or city, and book a time that suits you.",
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
                <LandingImg
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
              <h3 className="mt-6 font-display text-2xl font-medium tracking-tight text-midnight">
                {item.title}
              </h3>
              <p className="mt-4 max-w-sm text-base leading-relaxed tracking-wide text-graphite-500 dark:text-slate-400">
                {item.desc}
              </p>
              <span className="mt-5 inline-flex items-center text-base font-medium text-primary-500 group-hover:gap-2">
                Learn more <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export const PlatformScale = () => {
  const stats = usePlatformStats();
  const scaleStats = [
    { value: formatStat(stats.doctors), unit: "providers", label: "Verified practitioners on the platform" },
    { value: formatStat(stats.hospitals), unit: "facilities", label: "Hospitals & clinics listed" },
    { value: formatStat(stats.pharmacies), unit: "pharmacies", label: "Dispensaries & pharmacies listed" },
    { value: formatStat(stats.appointments), unit: "appointments", label: "Booked through the platform" },
  ].filter((stat) => stat.value !== null);
  if (scaleStats.length === 0) return null;
  return (
  <section className="vf-section relative overflow-hidden border-t border-canvas-silk">
    {/* Full-bleed photographic band — the "different colour" in the Apple-like rhythm. */}
    <div className="absolute inset-0" aria-hidden>
      <LandingImg
        src={unsplash(LANDING_PHOTOS.scaleBand, 1600)}
        srcSet={unsplashSrcSet(LANDING_PHOTOS.scaleBand, [800, 1200, 1600, 2000])}
        sizes="100vw"
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-slate-950/70" />
    </div>
    <div className="relative mx-auto max-w-content px-4 sm:px-6 lg:px-8">
      <h2 className="mx-auto max-w-3xl text-center font-display text-3xl sm:text-4xl font-medium tracking-tight text-white">
        Built for everyday care. Ready for Zambia at scale.
      </h2>
      <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-10">
        {scaleStats.map((stat) => (
          <div key={stat.label} className="text-center lg:text-left">
            <div className="font-display text-3xl font-medium tracking-tight text-white">
              {stat.value}
              <span className="ml-1 text-base text-white/60">{stat.unit}</span>
            </div>
            <p className="mt-2 text-xs text-white/70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

export const CareExperience = () => {
  const navigate = useNavigate();
  return (
    <section className="vf-section bg-canvas-bone border-t border-canvas-silk">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="vf-eyebrow">
              <HeartPulse className="h-3.5 w-3.5 text-primary-500" />
              For patients
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-midnight tracking-tight leading-[1.15]">
              Care that fits into{" "}
              <span className="text-primary-500">your everyday life.</span>
            </h2>
            <p className="text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">
              Doctors, pharmacies, labs and hospitals in one account. Book a visit, order medicines and keep your records together — from anywhere in Zambia.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {[
                { badge: "Video Visits", title: "Video Telehealth", desc: "Book video consultations with certified doctors at their available times.", route: "/video-dashboard" },
                { badge: "Pharmacy", title: "Pharmacy Delivery", desc: "Order prescribed medications for delivery from participating pharmacies.", route: "/search?type=pharmacy" },
                { badge: "NHIMA", title: "Insurance Accepted", desc: "Digital claims with coverage estimates. Actual coverage confirmed by your insurer.", route: "/pricing" },
                { badge: "Emergency", title: "Emergency Contacts", desc: "Quick access to emergency numbers and your personal contacts.", route: "/emergency" },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="vf-card !p-4 text-left cursor-pointer group"
                >
                  <span className="inline-block px-2.5 py-0.5 rounded-pill text-xs font-medium mb-2 bg-primary-50 text-primary-600 border border-primary-100">
                    {item.badge}
                  </span>
                  <div className="font-medium text-base text-midnight group-hover:text-primary-500 transition-colors">{item.title}</div>
                  <div className="text-xs text-graphite-500 dark:text-slate-400 mt-1 leading-snug tracking-wide">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-canvas-silk bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-card overflow-hidden">
            <div className="rounded-2xl overflow-hidden relative">
              <LandingImg
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
              <div className="absolute inset-x-0 bottom-0 p-4 bg-midnight/80">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-base text-white">Video consultations</div>
                    <div className="text-xs text-white/70">Video visit with a verified doctor</div>
                  </div>
                  <button
                    onClick={() => navigate("/video-dashboard")}
                    className="px-5 py-3 rounded-pill text-sm font-semibold bg-gold hover:bg-gold-deep text-gold-ink shrink-0"
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
      desc: "Browse verified practitioners across 20+ specialties. See each doctor's fees and available times, then choose a slot.",
      metrics: ["Verified Doctors", "Fees shown upfront", "Provider confirms your time"],
      badge: "Booking",
      preview: (
        <div className="space-y-2.5">
          {[
            { step: "Search", detail: "Find a doctor by name, specialty or location" },
            { step: "See the fee upfront", detail: "Each provider sets their own consultation fee" },
            { step: "Pick a time", detail: "Choose an available slot — the provider confirms it" },
          ].map((d, i) => (
            <div key={`${d.step}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-bone border border-canvas-silk">
              <div>
                <div className="font-medium text-sm text-midnight">{d.step}</div>
                <div className="text-xs text-graphite-500 dark:text-slate-400">{d.detail}</div>
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
      desc: "Your doctor sends the prescription to your phone after the visit. Choose a licensed pharmacy for pickup, or have it delivered.",
      metrics: ["Sent to your pharmacy", "Licensed pharmacies only", "Pickup or delivery"],
      badge: "Pharmacy",
      preview: (
        <div className="space-y-2.5">
          {[
            { step: "Issued by your doctor", detail: "Sent digitally after your consultation" },
            { step: "Lands in your records", detail: "View your prescription any time in the app" },
            { step: "Pickup or delivery", detail: "From a licensed pharmacy of your choice" },
          ].map((d, i) => (
            <div key={`${d.step}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-bone border border-canvas-silk">
              <div>
                <div className="font-medium text-sm text-midnight">{d.step}</div>
                <div className="text-xs text-graphite-500 dark:text-slate-400">{d.detail}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "NHIMA Insurance",
      icon: ShieldCheck,
      title: "NHIMA and private insurance",
      desc: "Check whether your NHIMA or private cover applies to a consultation, lab test or hospital visit before you pay. Your insurer confirms the final coverage.",
      metrics: ["Cover shown at booking", "Claims filed digitally", "NHIMA accepted"],
      badge: "Insurance",
      preview: (
        <div className="space-y-2.5">
          {[
            { step: "Add your cover", detail: "Save your NHIMA or private insurance details to your profile" },
            { step: "Checked at booking", detail: "Eligibility is checked before you pay" },
            { step: "Insurer confirms", detail: "Your insurer confirms the final coverage" },
          ].map((d, i) => (
            <div key={`${d.step}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-bone border border-canvas-silk">
              <div>
                <div className="font-medium text-sm text-midnight">{d.step}</div>
                <div className="text-xs text-graphite-500 dark:text-slate-400">{d.detail}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: "Emergency & ER",
      icon: HeartPulse,
      title: "24/7 emergency ambulance & bed finder",
      desc: "In emergencies every second counts. Find the nearest open ICU hospital, track ambulance ETA, and alert physicians before you arrive.",
      metrics: ["Call 116 dispatch", "Nearest open facility", "Ambulance tracking"],
      badge: "Emergency",
      preview: (
        <div className="space-y-2.5">
          {[
            { step: "Call 116", detail: "Emergency dispatch, 24/7" },
            { step: "Share your location", detail: "So help can find you fast" },
            { step: "Nearest open facility", detail: "Get directed to care near you" },
          ].map((d, i) => (
            <div key={`${d.step}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl bg-canvas-bone border border-canvas-silk">
              <div>
                <div className="font-medium text-sm text-midnight">{d.step}</div>
                <div className="text-xs text-graphite-500 dark:text-slate-400">{d.detail}</div>
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
Core features
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-midnight tracking-tight">
            Book, consult, and get your medicines.
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
              <div className="text-base font-medium text-midnight">{f.tab}</div>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center rounded-card bg-canvas-bone border border-canvas-silk p-6 sm:p-10">
          <div className="space-y-5">
            <span className="inline-block px-3 py-1 rounded-pill text-xs font-medium bg-primary-50 text-primary-600 border border-primary-100">
              {active.badge}
            </span>
            <h3 className="font-display text-xl font-medium text-midnight leading-tight">{active.title}</h3>
            <p className="text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">{active.desc}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {active.metrics.map((m) => (
                <span key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-700 text-xs font-medium text-graphite-700 dark:text-slate-200">
                  <CheckCircle className="h-3.5 w-3.5 text-success-500" />
                  {m}
                </span>
              ))}
            </div>
            <button
              onClick={() => navigate("/search")}
              className="inline-flex items-center justify-center gap-2 rounded-pill bg-gold px-6 py-3 text-sm font-semibold text-gold-ink transition-colors hover:bg-gold-deep"
            >
              Find Doctors Now <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 rounded-card bg-white dark:bg-slate-900 border border-canvas-silk shadow-card">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-canvas-mist">
              <div className="flex items-center gap-2">
                <active.icon className="h-4 w-4 text-primary-500" />
                <span className="text-xs font-medium text-graphite-700">{active.tab} Preview</span>
              </div>
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
              <Building2 className="h-3.5 w-3.5 text-primary-500" />
              For Doctors, Clinics & Hospitals
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-midnight tracking-tight leading-tight">
              Take bookings from patients{" "}
              <span className="text-primary-500">with Doc&apos; O Clock.</span>
            </h2>
            <p className="text-base text-graphite-500 dark:text-slate-400 leading-relaxed tracking-wide">
              Join practitioners and institutions reaching patients across Zambia. Manage bookings, telehealth, e-prescriptions, and NHIMA billing in one place.
            </p>
            <div className="space-y-3 pt-1">
              {[
                { title: "A profile patients can find", desc: "Your verified profile appears in search with your fees and available times." },
                { title: "Video consultations", desc: "Encrypted video visits, with notes kept in the patient record." },
                { title: "Prescriptions and records", desc: "Send prescriptions to pharmacies and keep patient records in one place." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-card bg-white dark:bg-slate-900 border border-canvas-silk">
                  <CheckCircle2 className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-base text-midnight">{item.title}</div>
                    <div className="text-xs text-graphite-500 dark:text-slate-400 mt-0.5 tracking-wide">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => navigate("/auth?tab=signup")}
                className="inline-flex items-center justify-center gap-2 rounded-pill bg-gold px-6 py-3 text-sm font-semibold text-gold-ink transition-colors hover:bg-gold-deep"
              >
                Join as Healthcare Provider <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate("/pricing")} className="vf-btn-secondary">
                View Plans
              </button>
            </div>
          </div>

          <div className="rounded-card border border-canvas-silk bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-5">
            <div className="overflow-hidden rounded-2xl -mx-0">
              <LandingImg
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
              <span className="px-3 py-1 rounded-pill text-xs font-medium text-white bg-success-500">Preview</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Visit Types", value: "Video + Clinic", sub: "In-person or remote" },
                { label: "Records", value: "Digital", sub: "History in one place" },
                { label: "Booking", value: "Seconds", sub: "Direct from phone" },
                { label: "Coverage", value: "Nationwide", sub: "All of Zambia" },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-card bg-canvas-bone border border-canvas-silk">
                  <div className="text-xs text-graphite-400 font-medium uppercase tracking-wider">{m.label}</div>
                  <div className="text-[clamp(1.2rem,6vw,1.5rem)] font-display font-light text-primary-500 mt-1">{m.value}</div>
                  <div className="text-xs text-graphite-500 dark:text-slate-400 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
