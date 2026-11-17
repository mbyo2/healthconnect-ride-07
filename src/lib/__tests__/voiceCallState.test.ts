import { describe, it, expect } from "vitest";
import {
  callSummaryText,
  formatCallDuration,
  initialVoiceCallState,
  voiceCallReducer,
} from "../voiceCallState";

describe("voiceCallReducer", () => {
  it("starts an outgoing call only from idle", () => {
    const s = voiceCallReducer(initialVoiceCallState, { type: "START_OUTGOING", callId: "c1" });
    expect(s.phase).toBe("outgoing");
    expect(s.callId).toBe("c1");
    const again = voiceCallReducer(s, { type: "START_OUTGOING", callId: "c2" });
    expect(again.callId).toBe("c1"); // second call ignored while busy
  });

  it("accepts a ring only from idle and moves to active on ACCEPTED", () => {
    const ringing = voiceCallReducer(initialVoiceCallState, {
      type: "RING_RECEIVED",
      callId: "c1",
      callerId: "u1",
    });
    expect(ringing.phase).toBe("incoming");
    const active = voiceCallReducer(ringing, { type: "ACCEPTED" });
    expect(active.phase).toBe("active");
    expect(active.callId).toBe("c1");
  });

  it("records the end reason and resets", () => {
    const active = voiceCallReducer(
      voiceCallReducer(initialVoiceCallState, { type: "START_OUTGOING", callId: "c1" }),
      { type: "ACCEPTED" },
    );
    const ended = voiceCallReducer(active, { type: "END", reason: "declined" });
    expect(ended.phase).toBe("ended");
    expect(ended.endReason).toBe("declined");
    expect(voiceCallReducer(ended, { type: "RESET" })).toEqual(initialVoiceCallState);
  });

  it("ignores END from idle", () => {
    expect(voiceCallReducer(initialVoiceCallState, { type: "END", reason: "ended" })).toEqual(
      initialVoiceCallState,
    );
  });
});

describe("formatCallDuration", () => {
  it("formats mm:ss", () => {
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(5)).toBe("0:05");
    expect(formatCallDuration(65)).toBe("1:05");
    expect(formatCallDuration(600)).toBe("10:00");
  });
});

describe("callSummaryText", () => {
  it("covers every end reason shown in the thread", () => {
    expect(callSummaryText("ended", 134)).toBe("Voice call · 2:14");
    expect(callSummaryText("declined", 0)).toBe("Voice call · declined");
    expect(callSummaryText("missed", 0)).toBe("Voice call · missed");
    expect(callSummaryText("cancelled", 0)).toBe("Voice call · cancelled");
    expect(callSummaryText("failed", 0)).toBe("Voice call · could not connect");
  });
});
