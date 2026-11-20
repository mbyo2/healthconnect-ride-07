import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CAPTURE_PROFILES,
  stepDownProfile,
  stepUpProfile,
  netStateFromEvent,
} from "@/lib/videoQuality";

// Zoom-parity pass (2026-11-20, CEO: "For quality and smoothness of
// the features copy zoom"). Every room property below was probed
// against the LIVE Daily API before shipping (throwaway rooms created,
// read back, deleted — evidence in ~/workspace/doc-zoom-evidence/):
// all 22 candidates returned 200 individually and as a full set. These
// pins exist so a future edit can't silently drop a quality lever or
// reintroduce an invalid property (the recording_consent outage class).

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const createRoomFn = read("supabase/functions/create-daily-room/index.ts");
const roomUi = read("src/components/video/VideoRoom.tsx");
const controlsUi = read("src/components/video/VideoControls.tsx");
const consultationUi = read("src/components/video/VideoConsultation.tsx");
const videoCallPage = read("src/pages/VideoCall.tsx");
const listUi = read("src/components/video/ConsultationList.tsx");

describe("create-daily-room v4 — probe-verified quality properties", () => {
  it("pins the call to the closest Daily region (Cape Town)", () => {
    expect(createRoomFn).toContain('geo: "af-south-1"');
  });

  it("enables adaptive simulcast so quality follows the network", () => {
    expect(createRoomFn).toContain("enable_adaptive_simulcast: true");
    expect(createRoomFn).toContain("enable_multiparty_adaptive_simulcast: true");
  });

  it("enables the Zoom-style in-call features Daily supports", () => {
    for (const prop of [
      "enable_hand_raising: true",
      "enable_emoji_reactions: true",
      "enable_people_ui: true",
      "enable_pip_ui: true",
      "enable_noise_cancellation_ui: true",
      "enable_video_processing_ui: true",
      "enable_cpu_warning_notifications: true",
      "enable_prejoin_ui: true",
      "enable_network_ui: true",
      "enable_screenshare: true",
    ]) {
      expect(createRoomFn).toContain(prop);
    }
  });

  it("keeps Daily's own chat OFF — chat lives in the app shell", () => {
    expect(createRoomFn).toContain("enable_chat: false");
  });

  it("caps participants unconditionally (a 3rd joiner must not fail)", () => {
    expect(createRoomFn).toContain("max_participants: 4");
    // The old code only set max_participants when optimize_for_network
    // was on; the cap must not be conditional any more.
    expect(createRoomFn).not.toContain("if (optimize_for_network)");
  });

  it("keeps the degrade ladder so no optional feature can block a visit", () => {
    expect(createRoomFn).toContain("buildRoomBody(false)");
    expect(createRoomFn).toContain("buildCoreRoomBody(false)");
    expect(createRoomFn).toContain("buildMinimalRoomBody()");
  });

  it("mints the token with the participant's display name", () => {
    expect(createRoomFn).toContain("user_name: displayName");
  });

  it("mints the token and marks the visit active in parallel (join latency)", () => {
    expect(createRoomFn).toContain("await Promise.all([");
  });

  it("never reintroduces a property Daily rejects", () => {
    for (const prop of ["recording_consent", "recording_resolution", "ui_config"]) {
      expect(createRoomFn).not.toContain(`${prop}:`);
    }
  });
});

describe("VideoRoom — quality + smoothness wiring", () => {
  it("starts the call at the HD capture profile with browser audio processing", () => {
    expect(roomUi).toContain("CAPTURE_PROFILES[initialProfile]");
    expect(roomUi).toContain("echoCancellation: true");
    expect(roomUi).toContain("noiseSuppression: true");
    expect(roomUi).toContain("autoGainControl: true");
  });

  it("never sends the old bogus `bandwidth` media constraint", () => {
    expect(roomUi).not.toContain("bandwidth: { max:");
    expect(roomUi).not.toContain("bandwidth:");
  });

  it("turns on adaptive send layers + detail-optimised screen share", () => {
    expect(roomUi).toContain("allowAdaptiveLayers: true");
    expect(roomUi).toContain('maxQuality: "high"');
    expect(roomUi).toContain('screenVideo: "detail-optimized"');
  });

  it("layers Daily noise cancellation onto the microphone after join", () => {
    expect(roomUi).toContain('"noise-cancellation"');
  });

  it("shows a live connection indicator and steps quality with the network", () => {
    expect(roomUi).toContain("network-quality-change");
    expect(roomUi).toContain("netStateFromEvent");
    expect(roomUi).toContain("stepDownProfile");
    expect(roomUi).toContain("stepUpProfile");
    expect(roomUi).toContain("Your connection is weak");
  });

  it("offers Speaker and Gallery layouts via the supported call API", () => {
    expect(roomUi).toContain("setActiveSpeakerMode");
    expect(roomUi).toContain("Speaker");
    expect(roomUi).toContain("Gallery");
  });

  it("runs in-call chat over app-messages and stores nothing", () => {
    expect(roomUi).toContain("dococlock-chat");
    expect(roomUi).toContain("sendAppMessage");
    expect(roomUi).toContain("aren't saved");
  });

  it("offers background blur through Daily's video processor", () => {
    expect(roomUi).toContain("background-blur");
    expect(roomUi).toContain("video-processor-error");
  });

  it("has a Zoom-style visit info panel with live network stats", () => {
    expect(roomUi).toContain("Visit info");
    expect(roomUi).toContain("getNetworkStats");
  });

  it("gates the patient in a waiting state until the provider is present", () => {
    expect(roomUi).toContain("visit-presence-");
    expect(roomUi).toContain("Waiting for");
    expect(roomUi).toContain("to start the visit");
    expect(roomUi).toContain("Join the room directly");
  });

  it("themes the in-frame UI with the app colours", () => {
    expect(roomUi).toContain('accent: "#003087"');
    expect(roomUi).toContain('accent: "#FFC439"');
  });

  it("keeps the joining-status overlay click-through (lobby Join must work)", () => {
    // Proven live 2026-11-20: without pointer-events-none the
    // "Joining your visit…" overlay covers the Daily iframe and
    // swallows clicks, stranding users in the pre-join lobby.
    expect(roomUi).toContain("pointer-events-none absolute inset-0");
  });
});

describe("VideoControls — quality picker", () => {
  it("offers Auto (Recommended) alongside fixed profiles", () => {
    expect(controlsUi).toContain('onQualityChange("auto")');
    expect(controlsUi).toContain("Auto (Recommended)");
  });

  it("offers background blur", () => {
    expect(controlsUi).toContain("Blur my background");
  });
});

describe("Join smoothness — prefetch on both entry points", () => {
  it("list page warms room + token ahead of the click", () => {
    expect(consultationUi).toContain("prefetchRef");
    expect(consultationUi).toContain("prefetchJoin");
    expect(listUi).toContain("onPrefetch");
    expect(listUi).toContain("onPointerDown");
    expect(listUi).toContain("Visit in progress");
  });

  it("checklist page pre-mints while the patient prepares", () => {
    expect(videoCallPage).toContain("roomPromiseRef");
  });

  it("keeps EVERY hook above ConsultationList's early returns (React #310)", () => {
    // Regression pin for the live breakage of 2026-11-20: the prefetch
    // useEffect initially sat below `if (isLoading) return …`, so the
    // hook count changed when data arrived and React threw error #310
    // — the whole /video-consultations route fell behind the error
    // boundary for every signed-in user. The last hook in the file
    // must precede the first early return.
    const firstEarlyReturn = listUi.indexOf("if (isLoading) {");
    expect(firstEarlyReturn).toBeGreaterThan(-1);
    const lastHook = Math.max(
      listUi.lastIndexOf("useEffect("),
      listUi.lastIndexOf("useQuery("),
      listUi.lastIndexOf("useState("),
      listUi.lastIndexOf("useRef("),
      listUi.lastIndexOf("useMemo("),
      listUi.lastIndexOf("useCallback(")
    );
    expect(lastHook).toBeLessThan(firstEarlyReturn);
  });
});

describe("videoQuality helpers — unit behaviour", () => {
  it("HD profile asks for 720p ideal, 1080p max, 30fps", () => {
    expect(CAPTURE_PROFILES.high.width).toEqual({ ideal: 1280, max: 1920 });
    expect(CAPTURE_PROFILES.high.height).toEqual({ ideal: 720, max: 1080 });
    expect(CAPTURE_PROFILES.high.frameRate).toEqual({ ideal: 30, max: 30 });
  });

  it("low profile is a true data-saver (360p, 15fps)", () => {
    expect(CAPTURE_PROFILES.low.width).toEqual({ ideal: 640, max: 640 });
    expect(CAPTURE_PROFILES.low.height).toEqual({ ideal: 360, max: 360 });
    expect(CAPTURE_PROFILES.low.frameRate).toEqual({ ideal: 15, max: 15 });
  });

  it("steppers move one rung and clamp at both ends", () => {
    expect(stepDownProfile("high")).toBe("medium");
    expect(stepDownProfile("medium")).toBe("low");
    expect(stepDownProfile("low")).toBe("low");
    expect(stepUpProfile("low")).toBe("medium");
    expect(stepUpProfile("medium")).toBe("high");
    expect(stepUpProfile("high")).toBe("high");
  });

  it("maps Daily network events, incl. the deprecated threshold fallback", () => {
    expect(netStateFromEvent({ networkState: "good" })).toBe("good");
    expect(netStateFromEvent({ networkState: "warning" })).toBe("warning");
    expect(netStateFromEvent({ networkState: "bad" })).toBe("bad");
    expect(netStateFromEvent({ threshold: "good" })).toBe("good");
    expect(netStateFromEvent({ threshold: "low" })).toBe("warning");
    expect(netStateFromEvent({ threshold: "very-low" })).toBe("bad");
    expect(netStateFromEvent({})).toBe("unknown");
  });
});
