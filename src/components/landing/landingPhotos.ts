/**
 * Verified Unsplash photo IDs used on the landing page.
 * Every ID below was visually verified (2026-09-25) to show real
 * African health personnel / African medical scenes — no guessing.
 * Existing on-site photos are untouched; these only add to them.
 */
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

const BASE = "https://images.unsplash.com";

/** Single Unsplash URL at a given width (q=80 is visually lossless for photos). */
export function unsplash(id: string, w: number, q = 80): string {
  return `${BASE}/${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

/** Responsive srcset string from a list of widths. */
export function unsplashSrcSet(id: string, widths: number[], q = 80): string {
  return widths.map((w) => `${unsplash(id, w, q)} ${w}w`).join(", ");
}
