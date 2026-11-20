import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Regression pins for the 2026-11-20 video-consultation outage + the
// missing End Meeting. Root cause: create-daily-room sent Daily room
// properties that do not exist (recording_consent & friends) — Daily
// rejected the whole room-create with 400 "invalid property name
// 'recording_consent'", so the provider could never start a visit; the
// client then auto-retried the deterministic failure 3× ("errors non
// stop") and, separately, discarded the meeting token a private room
// requires. These pins keep every part of that from coming back.

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const createRoomFn = read("supabase/functions/create-daily-room/index.ts");
const endFn = read("supabase/functions/end-video-consultation/index.ts");
const consultationUi = read("src/components/video/VideoConsultation.tsx");
const videoCallPage = read("src/pages/VideoCall.tsx");
const roomUi = read("src/components/video/VideoRoom.tsx");

describe("create-daily-room — join path", () => {
  it("never sends Daily properties that do not exist (the outage)", () => {
    // The function's history comment names the properties for the
    // record; what must never come back is SENDING them — as object
    // keys or property assignments in the room payload.
    for (const prop of ["recording_consent", "recording_resolution", "recording_available_notification"]) {
      expect(createRoomFn).not.toContain(`${prop}:`);
      expect(createRoomFn).not.toContain(`.${prop} =`);
      expect(createRoomFn).not.toContain(`"${prop}"`);
    }
  });

  it("keeps cloud recording as the one valid recording property", () => {
    expect(createRoomFn).toContain('enable_recording = "cloud"');
  });

  it("falls back to a room without recording if Daily rejects it", () => {
    expect(createRoomFn).toContain("buildRoomBody(false)");
  });

  it("reuses an existing room instead of recreating it", () => {
    expect(createRoomFn).toContain("api.daily.co/v1/rooms/${roomName}");
  });

  it("mints a per-participant meeting token on every join and returns it", () => {
    expect(createRoomFn).toContain("api.daily.co/v1/meeting-tokens");
    expect(createRoomFn).toContain("token: tokenData.token");
  });

  it("refuses to open a visit that has already ended", () => {
    expect(createRoomFn).toContain('"This visit has already ended."');
    expect(createRoomFn).toContain("409");
  });

  it("marks the visit active when the room is first opened", () => {
    expect(createRoomFn).toContain('patch.status = "active"');
  });
});

describe("end-video-consultation — end for everyone", () => {
  it("is provider-only", () => {
    expect(endFn).toContain("consultation.provider_id !== user.id");
    expect(endFn).toContain("403");
  });

  it("stamps status, ended_at and ended_by", () => {
    expect(endFn).toContain('status: "completed"');
    expect(endFn).toContain("ended_at");
    expect(endFn).toContain("ended_by");
  });

  it("deletes the Daily room so everyone is ejected", () => {
    expect(endFn).toContain('method: "DELETE"');
    expect(endFn).toContain("api.daily.co/v1/rooms/${roomName}");
  });
});

describe("VideoConsultation (list page) — join + end wiring", () => {
  it("passes the minted meeting token into the room", () => {
    expect(consultationUi).toContain("meetingToken={meetingToken}");
  });

  it("has NO automatic retry loop on join failure", () => {
    expect(consultationUi).not.toContain("Retrying...");
    expect(consultationUi).not.toContain("maxRetries");
    expect(consultationUi).not.toContain("retryCount");
  });

  it("offers a manual retry after a failed join", () => {
    expect(consultationUi).toContain("joinError");
    expect(consultationUi).toContain("Try again");
  });

  it("ends the meeting through the server function", () => {
    expect(consultationUi).toContain("end-video-consultation");
  });

  it("exits the call when the other side ends the meeting (realtime)", () => {
    expect(consultationUi).toContain("postgres_changes");
    expect(consultationUi).toContain('setMeetingEnded("by-other")');
  });
});

describe("VideoCall page — join + end wiring", () => {
  it("always mints a token via the function (never enters tokenless)", () => {
    expect(videoCallPage).not.toContain("setMeetingUrl(consultation.meeting_url)");
    expect(videoCallPage).toContain("create-daily-room");
  });

  it("never writes video_consultations directly (no client UPDATE policy exists)", () => {
    expect(videoCallPage).not.toContain(".update({ status: 'completed' })");
    expect(videoCallPage).not.toContain(".update({ status: 'active' })");
  });

  it("wires End Meeting + provider flag into the room", () => {
    expect(videoCallPage).toContain("onEndMeeting={handleEndMeeting}");
    expect(videoCallPage).toContain("isProvider={isConsultationProvider}");
    expect(videoCallPage).toContain("end-video-consultation");
  });
});

describe("VideoRoom — in-call surface", () => {
  it("keeps the Daily iframe bounded to its container (not fixed full-viewport)", () => {
    expect(roomUi).not.toContain("position: 'fixed'");
    expect(roomUi).toContain("position: 'absolute'");
  });

  it("has an End Meeting control distinct from Leave", () => {
    expect(roomUi).toContain("End Meeting");
    expect(roomUi).toContain("Leave Visit");
    expect(roomUi).toContain("Click again to end for everyone");
  });

  it("shows a call-duration timer and a participant list", () => {
    expect(roomUi).toContain("formatCallDuration");
    expect(roomUi).toContain("in call");
    expect(roomUi).toContain("Participants");
  });

  it("can copy a join link for the consultation", () => {
    expect(roomUi).toContain("?join=${consultationId}");
    expect(roomUi).toContain("Copy join link");
  });

  it("never shows Daily's raw error text to users", () => {
    expect(roomUi).not.toContain("e.errorMsg || \"Unknown error\"");
    expect(roomUi).not.toContain("Video call error:");
  });
});
