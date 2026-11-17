import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Realtime channel helpers — two complementary patterns against the same
 * realtime-js 2.119 behaviour (port of the BMaGlass 2026-11-15
 * dashboard-crash fix, commit c610276 in stripeverse-clone).
 *
 * Why fixed names are a crash: realtime-js dedupes channels by topic —
 * `supabase.channel(name)` returns the existing channel when one with
 * that name is still registered — and `RealtimeChannel.on()` THROWS for
 * postgres_changes/presence once the channel is joining or joined.
 * Effect cleanup calls `supabase.removeChannel(channel)`, which is ASYNC
 * (it awaits the server unsubscribe ack before tearing the channel
 * down). So a fast unmount → remount reuses the still-joining channel
 * and `.on()` throws inside the effect.
 *
 * Pattern 1 — unique name per mount (`createRealtimeChannel`, group 1):
 * for postgres_changes subscriptions owned by one component instance
 * (ChatWindow, ChatList, delivery trackers). A per-instance suffix makes
 * a collision impossible; while the old channel drains, old and new may
 * both deliver the same row — handlers that append must dedupe by id
 * (ChatWindow does; see src/lib/chatThread.ts).
 *
 * Pattern 2 — ref-counted shared topic (`acquireChannel` /
 * `releaseChannel`, group 2): for broadcast topics deliberately shared
 * by exactly two holders (voice-call signalling: the ring mailbox and
 * the per-call channel). Every acquire/release pair is balanced and the
 * underlying channel is only removed when the last holder releases it,
 * so one side's cleanup never kills the other's subscription.
 */

// ---------------------------------------------------------------- pattern 1

/** Unique channel name for one subscription instance. Pure — tested. */
export function uniqueChannelName(baseName: string): string {
  return `${baseName}:${crypto.randomUUID()}`;
}

/** Create a realtime channel that can never collide with a previous mount's still-tearing-down channel. */
export function createRealtimeChannel(baseName: string): RealtimeChannel {
  return supabase.channel(uniqueChannelName(baseName));
}

/**
 * Remove a channel created by createRealtimeChannel. Fire-and-forget
 * on purpose: effect cleanup must never await the unsubscribe.
 */
export function removeRealtimeChannel(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel);
}

// ---------------------------------------------------------------- pattern 2

interface ChannelEntry {
  channel: RealtimeChannel;
  refs: number;
}

const entries = new Map<string, ChannelEntry>();

export function acquireChannel(
  topic: string,
  client: SupabaseClient = supabase as unknown as SupabaseClient,
): RealtimeChannel {
  const existing = entries.get(topic);
  if (existing) {
    existing.refs += 1;
    return existing.channel;
  }
  const channel = client.channel(topic);
  entries.set(topic, { channel, refs: 1 });
  return channel;
}

export function releaseChannel(
  topic: string,
  client: SupabaseClient = supabase as unknown as SupabaseClient,
): void {
  const existing = entries.get(topic);
  if (!existing) return;
  existing.refs -= 1;
  if (existing.refs <= 0) {
    entries.delete(topic);
    void client.removeChannel(existing.channel);
  }
}

/** Test-only: drop all bookkeeping (channels are not removed). */
export function __resetChannelRegistryForTests(): void {
  entries.clear();
}

/** Test-only: how many holders a topic currently has. */
export function __channelRefCountForTests(topic: string): number {
  return entries.get(topic)?.refs ?? 0;
}

/**
 * Voice calls use two topic shapes:
 *  - `voice-call-ring-<userId>` — addressable ring mailbox for one user.
 *    The payload carries only an unguessable call UUID; the callee verifies
 *    the call by reading the `voice_calls` row (RLS: participants only)
 *    before showing any UI, so a forged ring from a third user is ignored.
 *  - `voice-call-<callId>` — per-call signalling channel shared by exactly
 *    the two participants (the UUID is unguessable; SDP/ICE payloads are
 *    useless without the call row, which RLS hides from everyone else).
 */
export function voiceCallTopic(callId: string): string {
  return `voice-call-${callId}`;
}

export function voiceCallRingTopic(userId: string): string {
  return `voice-call-ring-${userId}`;
}
