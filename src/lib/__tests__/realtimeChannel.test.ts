import { describe, it, expect, beforeEach } from "vitest";
import {
  __channelRefCountForTests,
  __resetChannelRegistryForTests,
  acquireChannel,
  releaseChannel,
  voiceCallRingTopic,
  voiceCallTopic,
} from "../realtimeChannel";

// Fake supabase client: channel() mints a fresh object per call, like the
// real client — the bug class under test is two holders sharing one topic.
function makeFakeClient() {
  const removed: unknown[] = [];
  return {
    removed,
    channel: (topic: string) => ({ topic, __fake: true }),
    removeChannel: (ch: unknown) => {
      removed.push(ch);
      return Promise.resolve("ok");
    },
  } as unknown as Parameters<typeof acquireChannel>[1];
}

describe("ref-counted realtime channels", () => {
  beforeEach(() => __resetChannelRegistryForTests());

  it("two acquirers of one topic share one channel; removal waits for the last release", () => {
    const client = makeFakeClient();
    const a = acquireChannel("voice-call-x", client);
    const b = acquireChannel("voice-call-x", client);
    expect(a).toBe(b); // same underlying channel — no duplicate subscribe
    expect(__channelRefCountForTests("voice-call-x")).toBe(2);
    releaseChannel("voice-call-x", client);
    expect((client as unknown as { removed: unknown[] }).removed).toHaveLength(0);
    expect(__channelRefCountForTests("voice-call-x")).toBe(1);
    releaseChannel("voice-call-x", client);
    expect((client as unknown as { removed: unknown[] }).removed).toHaveLength(1);
    expect(__channelRefCountForTests("voice-call-x")).toBe(0);
  });

  it("different topics get different channels", () => {
    const client = makeFakeClient();
    const a = acquireChannel(voiceCallTopic("call-1"), client);
    const b = acquireChannel(voiceCallRingTopic("user-1"), client);
    expect(a).not.toBe(b);
  });

  it("releasing an unknown topic is a no-op", () => {
    const client = makeFakeClient();
    expect(() => releaseChannel("nope", client)).not.toThrow();
  });
});
