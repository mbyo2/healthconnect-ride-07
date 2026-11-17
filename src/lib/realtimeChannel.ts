import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ref-counted Realtime channel manager.
 *
 * realtime-js dedupes channels by topic inside one client: two components
 * that each call `supabase.channel(sameTopic)` share ONE underlying channel,
 * so one component's `removeChannel` silently kills the other's subscription
 * (the BMaGlass dashboard crash). Every acquire/release pair here is
 * balanced, and the underlying channel is only removed when the last
 * holder releases it.
 *
 * Voice calls use two topic shapes:
 *  - `voice-call-ring-<userId>` — addressable ring mailbox for one user.
 *    The payload carries only an unguessable call UUID; the callee verifies
 *    the call by reading the `voice_calls` row (RLS: participants only)
 *    before showing any UI, so a forged ring from a third user is ignored.
 *  - `voice-call-<callId>` — per-call signalling channel shared by exactly
 *    the two participants (the UUID is unguessable; SDP/ICE payloads are
 *    useless without the call row, which RLS hides from everyone else).
 */
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

export function voiceCallTopic(callId: string): string {
  return `voice-call-${callId}`;
}

export function voiceCallRingTopic(userId: string): string {
  return `voice-call-ring-${userId}`;
}
