// In-app text chat regression tests (group 1 of 4, 2026-11-17).
//
// Pins the realtime-js 2.119 remount-race fix ported from BMaGlass
// (commit c610276): ChatWindow's old fixed channel name
// `messages-<providerId>` collided on fast unmount → remount —
// realtime-js dedupes channels by topic and .on() throws once the
// channel is joining/joined, which the page error boundary rendered
// as "This page hit a problem". The fix is a unique channel name per
// mount (src/lib/realtimeChannel.ts), applied to every realtime
// subscription this mission touched, with append-by-id dedupe for the
// brief old-channel-drain overlap (src/lib/chatThread.ts).
//
// Two of these tests FAIL pre-fix (fixed name throws on remount; the
// duplicate delivery lands twice without dedupe) and pass post-fix.

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { uniqueChannelName } from "@/lib/realtimeChannel";
import { appendIncomingMessage, isThreadMessage } from "@/lib/chatThread";
import type { Message } from "@/types/communication";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "..");
const read = (rel: string) => fs.readFileSync(path.resolve(SRC, rel), "utf8");

// ---------------------------------------------------------------------
// Faithful fake of the realtime-js 2.119 contract (same shape as the
// BMaGlass regression test, verified against
// node_modules/@supabase/realtime-js@2.119.0).
// ---------------------------------------------------------------------

type ChannelState = "closed" | "joining" | "joined";

class FakeChannel {
  readonly topic: string;
  state: ChannelState = "closed";
  bindings = 0;
  constructor(topic: string) {
    this.topic = topic;
  }
  on(type: string): this {
    if (
      (this.state === "joined" || this.state === "joining") &&
      (type === "presence" || type === "postgres_changes")
    ) {
      throw new Error(
        `cannot add \`${type}\` callbacks for ${this.topic} after \`subscribe()\`.`,
      );
    }
    this.bindings += 1;
    return this;
  }
  subscribe(): this {
    this.state = "joining";
    return this;
  }
}

class FakeRealtimeClient {
  private channels: FakeChannel[] = [];
  // RealtimeClient.channel (realtime-js 2.119.0): returns the existing
  // channel when one with that topic is still registered.
  channel(name: string): FakeChannel {
    const topic = `realtime:${name}`;
    const existing = this.channels.find((c) => c.topic === topic);
    if (existing) return existing;
    const chan = new FakeChannel(topic);
    this.channels.push(chan);
    return chan;
  }
  // RealtimeClient.removeChannel: async — teardown happens only after
  // the unsubscribe resolves, NOT synchronously.
  async removeChannel(channel: FakeChannel): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    channel.state = "closed";
    this.channels = this.channels.filter((c) => c !== channel);
  }
}

// The subscription pattern every realtime effect in the app follows:
// .channel(name).on(...).subscribe(), with cleanup that does NOT
// await the removal (React effect cleanup cannot await).
function mountSubscription(client: FakeRealtimeClient, name: string): FakeChannel {
  return client.channel(name).on("postgres_changes").subscribe();
}
function unmountSubscription(client: FakeRealtimeClient, channel: FakeChannel): void {
  void client.removeChannel(channel);
}

const msg = (over: Partial<Message> = {}): Message => ({
  id: "m1",
  content: "hello",
  sender_id: "provider-1",
  receiver_id: "patient-1",
  created_at: new Date().toISOString(),
  read: false,
  ...over,
});

describe("realtime channel names (in-app chat, 2026-11-17)", () => {
  it("uniqueChannelName gives every mount its own name", () => {
    const a = uniqueChannelName("messages");
    const b = uniqueChannelName("messages");
    expect(a).not.toBe(b);
    expect(a.startsWith("messages:")).toBe(true);
    expect(b.startsWith("messages:")).toBe(true);
  });

  it("a fixed channel name throws on a fast unmount → remount (pre-fix behaviour)", () => {
    const client = new FakeRealtimeClient();
    const first = mountSubscription(client, "messages-provider-1");
    expect(first.state).toBe("joining");
    unmountSubscription(client, first);
    // Remount before the async teardown lands: same name returns the
    // still-joining channel and .on() throws — the crash.
    expect(() => mountSubscription(client, "messages-provider-1")).toThrow(
      /cannot add `postgres_changes` callbacks/,
    );
  });

  it("two mounts of the same conversation never throw and never share a channel", () => {
    const client = new FakeRealtimeClient();
    const first = mountSubscription(client, uniqueChannelName("messages"));
    unmountSubscription(client, first);
    // Second mount (same conversation, new ChatWindow instance) gets
    // its own channel — no throw even though teardown hasn't landed.
    const second = mountSubscription(client, uniqueChannelName("messages"));
    expect(second).not.toBe(first);
    expect(second.bindings).toBe(1);
    expect(first.bindings).toBe(1);
  });

  it("the same INSERT delivered by both the draining old channel and the new one lands once", () => {
    const userId = "patient-1";
    const otherId = "provider-1";
    const incoming = msg();
    let list: Message[] = [];
    // Old channel drains: delivers the row.
    list = appendIncomingMessage(list, incoming, userId, otherId);
    // New channel delivers the identical row a moment later.
    list = appendIncomingMessage(list, incoming, userId, otherId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("m1");
  });

  it("rows from other conversations never land in this thread", () => {
    const userId = "patient-1";
    const otherId = "provider-1";
    const stranger = msg({ id: "m2", sender_id: "patient-2", receiver_id: "provider-1" });
    expect(isThreadMessage(stranger, userId, otherId)).toBe(false);
    expect(appendIncomingMessage([], stranger, userId, otherId)).toHaveLength(0);
    const mine = msg({ id: "m3", sender_id: "patient-1", receiver_id: "provider-1" });
    expect(isThreadMessage(mine, userId, otherId)).toBe(true);
  });
});

describe("no fixed-name realtime channel survives in the migrated chat/delivery surfaces", () => {
  // Every realtime subscription this mission touched must go through
  // createRealtimeChannel. Any .channel( left behind is the crash
  // pattern again (a second mount reuses a joining channel and .on()
  // throws). Out-of-scope files (other missions' surfaces) are NOT
  // covered here — this guard pins only what this mission owns.
  const MIGRATED = [
    "components/chat/ChatWindow.tsx",
    "components/chat/ChatList.tsx",
    "components/delivery/PatientDeliveryTracking.tsx",
    "components/delivery/CourierDeliveryDashboard.tsx",
    "components/pharmacy/LiveDeliveryTracker.tsx",
    "pages/Appointments.tsx",
  ];
  it.each(MIGRATED)("%s has no direct supabase.channel( call", (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/\.channel\(/);
    expect(src).toContain("createRealtimeChannel");
    expect(src).toContain("removeRealtimeChannel");
  });

  it("src/lib/realtimeChannel.ts exists and exports the factory", () => {
    const src = read("lib/realtimeChannel.ts");
    expect(src).toContain("export function uniqueChannelName");
    expect(src).toContain("export function createRealtimeChannel");
    expect(src).toContain("export function removeRealtimeChannel");
    expect(src).toContain("crypto.randomUUID()");
  });
});
