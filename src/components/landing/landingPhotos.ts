/**
 * Landing-page photos, SELF-HOSTED under public/images/landing.
 *
 * Previously these were Unsplash hotlinks — fast when the CDN cooperated,
 * broken whenever a network, proxy or blocker interfered. Same-origin files
 * ride Vercel's edge cache, need no referrer tricks, and can't be blocked
 * without blocking the site itself.
 *
 * The `unsplash()` / `unsplashSrcSet()` helpers keep their signatures so
 * call sites don't change; they now resolve to the local file (width/q
 * params are baked in at download time).
 */
const LOCAL: Record<string, string> = {
  // Hero + care + old-Hero avatars
  "photo-1581594693702-fbdc51b2763b": "/images/landing/hero-1600.jpg",
  "photo-1594824476967-48c8b964273f": "/images/landing/care-1200.jpg",
  "photo-1622253692010-333f2da6031d": "/images/landing/avatar-1.jpg",
  "photo-1559839734-2b71ea197ec2": "/images/landing/avatar-doc-2.jpg",
  "photo-1651008376811-b90baee60c1f": "/images/landing/avatar-doc-3.jpg",
  // How-it-works steps
  "photo-1576091160399-112ba8d25d1d": "/images/landing/book-800.jpg",
  "photo-1576091160550-2173dba999ef": "/images/landing/consult-800.jpg",
  "photo-1587854692152-cbe660dbde88": "/images/landing/pharmacy-800.jpg",
  // Bands + providers
  "photo-1579684385127-1ef15d508118": "/images/landing/scale-1600.jpg",
  "photo-1666214280557-f1b5022eb634": "/images/landing/providers-1200.jpg",
  "photo-1551601651-2a8555f1a136": "/images/landing/cta-1600.jpg",
  // Testimonial avatars
  "photo-1505421031134-e57263cae630": "/images/landing/avatar-0.jpg",
  "photo-1532076904124-d4e8fe7fbbec": "/images/landing/avatar-2.jpg",
  "photo-1714118657863-2843a622718b": "/images/landing/avatar-3.jpg",
  "photo-1620424037570-15137a4a562d": "/images/landing/avatar-4.jpg",
  "photo-1655313836628-af779ac11e14": "/images/landing/avatar-5.jpg",
};

export const LANDING_PHOTOS = {
  /** African doctor's hands holding a phone — "Book" step */
  bookStep: "photo-1576091160399-112ba8d25d1d",
  /** Hands on a laptop with a stethoscope — "Consult" step */
  consultStep: "photo-1576091160550-2173dba999ef",
  /** Medicine pills spilling from a bottle — "Continue / pharmacy" step */
  pharmacyStep: "photo-1587854692152-cbe660dbde88",
  /** Surgical team seen from above — PlatformScale full-bleed band */
  scaleBand: "photo-1579684385127-1ef15d508118",
  /** African doctor reviewing a scan with a colleague — ForProviders */
  providers: "photo-1666214280557-f1b5022eb634",
  /** Two surgeons operating — CTA band */
  ctaBand: "photo-1551601651-2a8555f1a136",
} as const;

/** Testimonial avatars, in ZAMBIAN_TESTIMONIALS order (all visually verified). */
export const TESTIMONIAL_PHOTOS = [
  "photo-1505421031134-e57263cae630", // Chipo Mwanza — smiling woman in headwrap
  "photo-1622253692010-333f2da6031d", // Dr. Mulenga Banda — male nurse in scrubs
  "photo-1532076904124-d4e8fe7fbbec", // Thandiwe Phiri — woman with glasses
  "photo-1714118657863-2843a622718b", // Bwalya Chilufya — young man
  "photo-1620424037570-15137a4a562d", // Mwila Tembo — young woman
  "photo-1655313836628-af779ac11e14", // Dr. Ngosa Zimba — senior man
] as const;

const REMOTE_BASE = "https://images.unsplash.com";

/** Resolve a photo ID to its self-hosted file (remote fallback kept for unknown IDs). */
export function unsplash(id: string, w?: number, q?: number): string {
  return LOCAL[id] ?? `${REMOTE_BASE}/${id}?auto=format&fit=crop&w=${w ?? 800}&q=${q ?? 80}`;
}

/** Responsive srcset for a self-hosted file (same file, honest descriptors). */
export function unsplashSrcSet(id: string, widths: number[], q?: number): string {
  const url = unsplash(id, undefined, q);
  if (url.startsWith("/")) return widths.map((w) => `${url} ${w}w`).join(", ");
  return widths.map((w) => `${unsplash(id, w, q)} ${w}w`).join(", ");
}
