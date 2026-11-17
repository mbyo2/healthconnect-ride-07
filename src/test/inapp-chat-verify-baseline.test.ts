// In-app chat verification pins (group 4, phase 2, merged tip 6e127e92).
//
// Live-proven at phase-1 baseline (origin/main 39e6ace6) and re-proven on
// the merged tree (evidence in ~/workspace/doc-inapp-chat/verify/evidence/):
//   - ChatWindow send/receive between two QA users, both directions, REST
//     + realtime; cross-patient reads 0 rows; forged sender 403.
//   - F1 (phase 1): message-only pairs were invisible in ChatList —
//     RESOLVED on the merged tree by user_shares_message_with() +
//     "Message counterparts can view each other's profiles" (live policy).
//   - System notes render as centered bubbles (MessageBubble).
//   - Voice calls: signalling over Realtime broadcast, voice_calls row,
//     thread summary line.
// These pins guard the exact regressions that would silently break those
// properties. Follows the repo's guard-test pattern (has-role-oracle-guard,
// service-worker-isolation, till-bill-guard).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatCallDuration, callSummaryText } from "@/lib/voiceCallState";
import { isSystemReminderNote, SYSTEM_REMINDER_MARKER } from "@/lib/chatSystemNote";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const CHAT_WINDOW = "src/components/chat/ChatWindow.tsx";
const CHAT_LIST = "src/components/chat/ChatList.tsx";
const MESSAGE_BUBBLE = "src/components/chat/MessageBubble.tsx";

describe("in-app chat verification pins (group 4, merged tree)", () => {
  it("ChatWindow loads only the 1:1 thread, both directions", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain(".from('messages')");
    expect(src).toContain("sender_id.eq.${userId},receiver_id.eq.${providerId}");
    expect(src).toContain("sender_id.eq.${providerId},receiver_id.eq.${userId}");
    expect(src).toContain(".order('created_at', { ascending: true })");
  });

  it("ChatWindow realtime uses a unique channel per mount + thread-scoped append", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain("createRealtimeChannel('messages')");
    expect(src).toContain("appendIncomingMessage(prev, incoming, userId, providerId)");
    expect(src).toContain("isThreadMessage(incoming, userId, providerId)");
    expect(src).toContain("removeRealtimeChannel(activeChannel)");
    // No fixed channel name that can collide across mounts.
    expect(src).not.toContain("channel(`messages-${providerId}`)");
  });

  it("ChatWindow sends as the signed-in user only", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain("sender_id: user.id");
    expect(src).not.toMatch(/sender_id:\s*providerId/);
  });

  it("ChatWindow hosts the voice-call entry point (button + overlay)", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain('aria-label="Start voice call"');
    expect(src).toContain("useVoiceCall({ peerId: providerId");
    expect(src).toContain("<VoiceCallOverlay");
  });

  it("ChatList builds contacts only from message/appointment/delivery counterparts", () => {
    const src = readSrc(CHAT_LIST);
    expect(src).toContain(".from('messages')");
    expect(src).toContain(".from('appointments')");
    expect(src).toContain(".from('delivery_orders')");
    expect(src).toContain(".in('id', Array.from(counterpartIds))");
    // Never a bare whole-directory profiles listing.
    expect(src).not.toMatch(/from\('profiles'\)\s*\n?\s*\.select\('id, first_name, last_name, avatar_url, role'\)\s*\n?\s*;/);
  });

  it("MessageBubble renders system reminder notes centered, never as a provider bubble", () => {
    const src = readSrc(MESSAGE_BUBBLE);
    expect(src).toContain("isSystemReminderNote(message.content)");
    expect(src).toContain('role="note"');
    expect(src).toContain("justify-center");
    expect(src).toContain("Doc&apos;O Clock reminder");
    // The bracketed marker is a machine tag, stripped before display.
    expect(src).toContain("message.content.slice(SYSTEM_REMINDER_MARKER.length)");
  });

  it("system-note detector matches only the marker prefix", () => {
    expect(isSystemReminderNote("[Doc'O Clock reminder] Hi, you have an appointment")).toBe(true);
    expect(isSystemReminderNote("hello doctor")).toBe(false);
    expect(isSystemReminderNote("")).toBe(false);
    expect(isSystemReminderNote(null)).toBe(false);
    expect(SYSTEM_REMINDER_MARKER).toBe("[Doc'O Clock reminder]");
  });

  it("call summary lines and durations format as the thread shows them", () => {
    expect(formatCallDuration(38)).toBe("0:38");
    expect(formatCallDuration(0)).toBe("0:00");
    expect(formatCallDuration(125)).toBe("2:05");
    expect(callSummaryText("ended", 38)).toBe("Voice call · 0:38");
    expect(callSummaryText("declined", 0)).toBe("Voice call · declined");
    expect(callSummaryText("missed", 0)).toBe("Voice call · missed");
    expect(callSummaryText("failed", 0)).toBe("Voice call · could not connect");
  });
});
