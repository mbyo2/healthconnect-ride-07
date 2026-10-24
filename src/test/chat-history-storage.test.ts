import { describe, it, expect, beforeEach } from 'vitest';
import {
  LEGACY_CHAT_HISTORY_KEY,
  chatHistoryKey,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  purgeLegacyChatHistory,
} from '@/utils/chatHistoryStorage';

// Stage C2b (MedGemmaChat follow-up to P2-32): AI chat history must be
// per-user and session-scoped — never a global localStorage blob that
// survives sign-out on a shared device.

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('chatHistoryStorage', () => {
  it('keys are scoped per user', () => {
    expect(chatHistoryKey(USER_A)).not.toBe(chatHistoryKey(USER_B));
    expect(chatHistoryKey(USER_A)).toContain(USER_A);
  });

  it('one user cannot read another user\'s history', () => {
    saveChatHistory(USER_A, JSON.stringify([{ role: 'user', content: 'chest pain' }]));
    expect(loadChatHistory(USER_B)).toBeNull();
    expect(loadChatHistory(USER_A)).toContain('chest pain');
  });

  it('persists to sessionStorage only, never localStorage', () => {
    saveChatHistory(USER_A, 'payload');
    expect(localStorage.getItem(chatHistoryKey(USER_A))).toBeNull();
    expect(sessionStorage.getItem(chatHistoryKey(USER_A))).toBe('payload');
    expect(localStorage.length).toBe(0);
  });

  it('purges the legacy global localStorage history on load', () => {
    localStorage.setItem(LEGACY_CHAT_HISTORY_KEY, 'old-shared-history');
    loadChatHistory(USER_A);
    expect(localStorage.getItem(LEGACY_CHAT_HISTORY_KEY)).toBeNull();
  });

  it('purgeLegacyChatHistory removes only the legacy key', () => {
    localStorage.setItem(LEGACY_CHAT_HISTORY_KEY, 'x');
    localStorage.setItem('unrelated', 'y');
    purgeLegacyChatHistory();
    expect(localStorage.getItem(LEGACY_CHAT_HISTORY_KEY)).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('y');
  });

  it('clearChatHistory removes the user\'s session copy', () => {
    saveChatHistory(USER_A, 'payload');
    clearChatHistory(USER_A);
    expect(loadChatHistory(USER_A)).toBeNull();
    // Another user's copy is untouched.
    saveChatHistory(USER_B, 'b-payload');
    clearChatHistory(USER_A);
    expect(loadChatHistory(USER_B)).toBe('b-payload');
  });
});
