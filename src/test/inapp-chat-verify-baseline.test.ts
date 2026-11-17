// In-app chat baseline pins (group 4 verifier, 2026-11-17).
//
// Live-proven at baseline (origin/main 39e6ace6, evidence in
// ~/workspace/doc-inapp-chat/verify/evidence/baseline-results-2026-11-17.json):
//   - ChatWindow send/receive between two QA users works both directions
//     over REST, and realtime delivers the INSERT payload (~400 ms).
//   - A second patient's JWT reads ZERO rows of the first patient's thread
//     (RLS: SELECT sender OR receiver) and a forged sender_id insert 403s.
//   - ChatList shows only message/appointment counterparts, never the
//     whole user directory.
// These source pins guard the exact regressions that would silently break
// those properties. They follow the repo's guard-test pattern
// (has-role-oracle-guard, service-worker-isolation, till-bill-guard).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSrc = (p: string) => readFileSync(resolve(__dirname, "../../", p), "utf8");

const CHAT_WINDOW = "src/components/chat/ChatWindow.tsx";
const CHAT_LIST = "src/components/chat/ChatList.tsx";

describe("in-app chat baseline pins (verify group)", () => {
  it("ChatWindow loads only the 1:1 thread, both directions", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain(".from('messages')");
    // Both directions of the pair, nothing wider.
    expect(src).toContain("sender_id.eq.${userId},receiver_id.eq.${providerId}");
    expect(src).toContain("sender_id.eq.${providerId},receiver_id.eq.${userId}");
    expect(src).toContain(".order('created_at', { ascending: true })");
  });

  it("ChatWindow realtime handler ignores other conversations and dedupes", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain("incoming.sender_id === userId && incoming.receiver_id === providerId");
    expect(src).toContain("incoming.sender_id === providerId && incoming.receiver_id === userId");
    expect(src).toContain("if (!mine && !theirs) return prev");
    expect(src).toContain("prev.some(m => m.id === incoming.id)");
  });

  it("ChatWindow sends as the signed-in user only", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain("sender_id: user.id");
    // No caller-supplied sender, no receiver widening.
    expect(src).not.toMatch(/sender_id:\s*providerId/);
  });

  it("ChatList builds contacts only from message/appointment counterparts", () => {
    const src = readSrc(CHAT_LIST);
    expect(src).toContain(".from('messages')");
    expect(src).toContain(".from('appointments')");
    // Counterparts are resolved through the profiles table by id list only.
    expect(src).toContain(".in('id', Array.from(counterpartIds))");
    // Never a bare whole-directory profiles listing.
    expect(src).not.toMatch(/from\('profiles'\)\s*\n?\s*\.select\('id, first_name, last_name, avatar_url, role'\)\s*\n?\s*;/);
  });

  it("ChatWindow subscribes to a per-conversation channel", () => {
    const src = readSrc(CHAT_WINDOW);
    expect(src).toContain("supabase\n        .channel(`messages-${providerId}`)");
    expect(src).toContain("table: 'messages'");
    expect(src).toContain("supabase.removeChannel(activeChannel)");
  });
});
