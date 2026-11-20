// Capture-quality profiles + adaptation steps for video consultations.
//
// Zoom-parity pass (2026-11-20): before this, the app's "quality" prop
// was only a label on a dropdown — nothing applied capture settings
// when a call started, and the manual picker sent a `bandwidth` key
// that is not a media constraint at all. Now the call starts at the HD
// profile, Daily's adaptive simulcast (enabled on the room) moves the
// *sent layers* with the network, and in "auto" mode the client steps
// the *capture* profile down when the connection degrades and back up
// when it recovers — the picture softens instead of freezing, and the
// visit is never dropped for quality reasons.

export type CaptureProfile = "high" | "medium" | "low";

/** What the user picked: a fixed profile, or "auto" (follow the network). */
export type QualityMode = "auto" | CaptureProfile;

/** getUserMedia constraints per profile (all `ideal`, so a weaker
 *  camera simply gives its best instead of failing the join). */
export const CAPTURE_PROFILES: Record<CaptureProfile, MediaTrackConstraints> = {
  high: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  medium: {
    width: { ideal: 854, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 24, max: 30 },
  },
  low: {
    width: { ideal: 640, max: 640 },
    height: { ideal: 360, max: 360 },
    frameRate: { ideal: 15, max: 15 },
  },
};

const ORDER: CaptureProfile[] = ["low", "medium", "high"];

/** One step toward a softer picture (never below "low"). */
export function stepDownProfile(profile: CaptureProfile): CaptureProfile {
  const i = ORDER.indexOf(profile);
  return ORDER[Math.max(0, i - 1)];
}

/** One step toward a sharper picture (never above "high"). */
export function stepUpProfile(profile: CaptureProfile): CaptureProfile {
  const i = ORDER.indexOf(profile);
  return ORDER[Math.min(ORDER.length - 1, i + 1)];
}

/** Daily network states, normalised from the network-quality-change
 *  event (older payloads only carry the deprecated threshold). */
export type NetState = "good" | "warning" | "bad" | "unknown";

export function netStateFromEvent(e: {
  networkState?: string;
  threshold?: string;
}): NetState {
  if (
    e?.networkState === "good" ||
    e?.networkState === "warning" ||
    e?.networkState === "bad"
  ) {
    return e.networkState;
  }
  if (e?.threshold === "good") return "good";
  if (e?.threshold === "low") return "warning";
  if (e?.threshold === "very-low") return "bad";
  return "unknown";
}

export const NET_STATE_LABEL: Record<NetState, string> = {
  good: "Good connection",
  warning: "Fair connection",
  bad: "Weak connection",
  unknown: "Checking connection…",
};
