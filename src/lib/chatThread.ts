import type { Message } from "@/types/communication";

/**
 * 1:1 chat-thread helpers for ChatWindow (in-app text chat, 2026-11-17).
 *
 * Extracted pure so the realtime overlap contract is unit-testable:
 * when a mount's old channel is still draining, the old AND the new
 * channel can deliver the same INSERT — appending must be idempotent
 * by message id, and only rows of THIS 1:1 thread may land in the
 * list. Extracted verbatim from the inline logic ChatWindow used to
 * carry, so behaviour is unchanged.
 */

/** True when the row belongs to the 1:1 thread between userId and otherId. */
export function isThreadMessage(
  incoming: Pick<Message, "sender_id" | "receiver_id">,
  userId: string,
  otherId: string,
): boolean {
  const mine = incoming.sender_id === userId && incoming.receiver_id === otherId;
  const theirs = incoming.sender_id === otherId && incoming.receiver_id === userId;
  return mine || theirs;
}

/**
 * Append an incoming realtime row to the thread, or return the list
 * unchanged when the row is from another conversation or is already
 * present (old-channel drain delivering the same INSERT twice).
 */
export function appendIncomingMessage(
  prev: Message[],
  incoming: Message,
  userId: string,
  otherId: string,
): Message[] {
  if (!isThreadMessage(incoming, userId, otherId)) return prev;
  if (prev.some((m) => m.id === incoming.id)) return prev;
  return [...prev, incoming];
}
