import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupTwoFactor,
  verifyTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  isTwoFactorVerifiedThisSession,
  markTwoFactorVerifiedThisSession,
  clearTwoFactorSessionGate,
} from '@/utils/two-factor-service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock error handler
vi.mock('@/utils/error-handler', () => ({
  errorHandler: {
    handleError: vi.fn(),
  },
}));

describe('Two-Factor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTwoFactorSessionGate();
  });

  describe('setupTwoFactor', () => {
    it('should setup 2FA with QR code and backup codes', async () => {
      const mockSetupData = {
        qrCodeUrl: 'otpauth://totp/DocOClock:test@example.com?secret=ABC123',
        backupCodes: ['CODE1-ABCD', 'CODE2-EFGH'],
        manualEntryKey: 'ABC1 2345',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockSetupData,
        error: null,
      } as any);

      const result = await setupTwoFactor('user-123');
      expect(result.qrCodeUrl).toBe(mockSetupData.qrCodeUrl);
      expect(result.backupCodes).toEqual(mockSetupData.backupCodes);
      expect(result.manualEntryKey).toBe(mockSetupData.manualEntryKey);
    });

    it('should handle errors during setup', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Setup failed' },
        error: null,
      } as any);

      await expect(setupTwoFactor('user-123')).rejects.toThrow();
    });
  });

  describe('verifyTwoFactor', () => {
    it('should verify valid TOTP code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: true },
        error: null,
      } as any);

      const result = await verifyTwoFactor('user-123', '123456');
      expect(result).toBe(true);
    });

    it('should return false for invalid code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: false },
        error: null,
      } as any);

      const result = await verifyTwoFactor('user-123', '000000');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error('Network error'));

      const result = await verifyTwoFactor('user-123', '123456');
      expect(result).toBe(false);
    });
  });

  describe('enableTwoFactor', () => {
    it('should enable 2FA with valid verification code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: true },
        error: null,
      } as any);

      const result = await enableTwoFactor('user-123', '123456');
      expect(result).toBe(true);
    });

    it('should throw error for invalid verification code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: false },
        error: null,
      } as any);

      await expect(enableTwoFactor('user-123', '000000')).rejects.toThrow('Invalid verification code');
    });
  });

  describe('disableTwoFactor', () => {
    it('should disable 2FA with valid code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: true },
        error: null,
      } as any);

      await expect(disableTwoFactor('user-123', '123456')).resolves.not.toThrow();
    });

    it('should throw error for invalid code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { ok: false },
        error: null,
      } as any);

      await expect(disableTwoFactor('user-123', '000000')).rejects.toThrow('Invalid verification code');
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should return 2FA status when enabled', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { enabled: true, backup_codes_remaining: 8 },
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await getTwoFactorStatus('user-123');
      expect(result.enabled).toBe(true);
      expect(result.backupCodesRemaining).toBe(8);
    });

    it('should return disabled status when not enabled', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await getTwoFactorStatus('user-123');
      expect(result.enabled).toBe(false);
      expect(result.backupCodesRemaining).toBe(0);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes with valid code', async () => {
      const newCodes = ['NEW1-ABCD', 'NEW2-EFGH'];
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { backupCodes: newCodes },
        error: null,
      } as any);

      const result = await regenerateBackupCodes('user-123', '123456');
      expect(result).toEqual(newCodes);
    });

    it('should throw error for invalid code', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Invalid code' },
        error: null,
      } as any);

      await expect(regenerateBackupCodes('user-123', '000000')).rejects.toThrow();
    });
  });

  describe('Session Gate', () => {
    it('should mark session as verified', () => {
      const sessionId = 'session-123';
      markTwoFactorVerifiedThisSession(sessionId);
      expect(isTwoFactorVerifiedThisSession(sessionId)).toBe(true);
    });

    it('should return false for unverified session', () => {
      expect(isTwoFactorVerifiedThisSession('session-456')).toBe(false);
    });

    it('should return false for null session ID', () => {
      expect(isTwoFactorVerifiedThisSession(null)).toBe(false);
    });

    it('should clear session gate', () => {
      const sessionId = 'session-789';
      markTwoFactorVerifiedThisSession(sessionId);
      expect(isTwoFactorVerifiedThisSession(sessionId)).toBe(true);
      
      clearTwoFactorSessionGate();
      expect(isTwoFactorVerifiedThisSession(sessionId)).toBe(false);
    });
  });
});
