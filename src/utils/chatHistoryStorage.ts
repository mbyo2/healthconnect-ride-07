import { safeLocalRemove, safeSessionGet, safeSessionSet, safeSessionRemove } from './storage';

/**
 * MedGemma AI chat history persistence (Stage C2b, follow-up to P2-32).
 *
 * Before this change, MedGemmaChat persisted the full conversation —
 * patient-described symptoms, AI responses, and any attached image
 * payloads — to localStorage under ONE global key
 * ('doc_oclock_ai_chat_history'). On a shared clinic device the next
 * person to open the chat saw the previous user's conversation, and the
 * data survived browser restarts and sign-outs indefinitely.
 *
 * Now, mirroring the useAIChat PHI pattern already in this codebase:
 *  - history lives in sessionStorage only (gone when the tab/browser
 *    session ends, and wiped with the per-user caches on sign-out),
 *  - the key is scoped per user id, so two accounts sharing a browser
 *    profile can never read each other's history,
 *  - nothing is persisted at all until the caller's user id is known,
 *  - the legacy global localStorage copy is purged on first touch so
 *    pre-fix conversations do not linger on devices.
 */

export const LEGACY_CHAT_HISTORY_KEY = 'doc_oclock_ai_chat_history';

export function chatHistoryKey(userId: string): string {
  return `${LEGACY_CHAT_HISTORY_KEY}:${userId}`;
}

/** Remove the pre-fix global localStorage history, if present. */
export function purgeLegacyChatHistory(): void {
  safeLocalRemove(LEGACY_CHAT_HISTORY_KEY);
}

/** Load the raw stored history payload for one user (null if none). */
export function loadChatHistory(userId: string): string | null {
  purgeLegacyChatHistory();
  return safeSessionGet(chatHistoryKey(userId));
}

/** Persist the raw history payload for one user (session-scoped). */
export function saveChatHistory(userId: string, payload: string): void {
  safeSessionSet(chatHistoryKey(userId), payload);
}

/** Clear one user's stored history (and any legacy copy). */
export function clearChatHistory(userId: string | null): void {
  purgeLegacyChatHistory();
  if (userId) {
    safeSessionRemove(chatHistoryKey(userId));
  }
}
