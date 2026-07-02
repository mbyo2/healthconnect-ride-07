import { supabase } from '@/integrations/supabase/client';
import { errorHandler } from './error-handler';
import { logger } from './logger';

// All TOTP secret material lives server-side (edge function `totp-manage`).
// The client only handles setup UX and forwards user-entered codes for verification.

export interface TwoFactorSetup {
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  lastUsed?: Date;
}

const invoke = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke('totp-manage', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || '2FA request failed');
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as any;
};

export const setupTwoFactor = async (userId: string): Promise<TwoFactorSetup> => {
  try {
    logger.info('Setting up 2FA', 'TWO_FACTOR', { userId });
    const data = await invoke('setup');
    return {
      qrCodeUrl: data.qrCodeUrl,
      backupCodes: data.backupCodes,
      manualEntryKey: data.manualEntryKey,
    };
  } catch (error) {
    errorHandler.handleError(error, 'setupTwoFactor');
    throw error;
  }
};

export const verifyTwoFactor = async (userId: string, code: string): Promise<boolean> => {
  try {
    const data = await invoke('verify', { code });
    return !!data?.ok;
  } catch (error) {
    logger.warn('2FA verify failed', 'TWO_FACTOR', { userId });
    return false;
  }
};

export const enableTwoFactor = async (userId: string, verificationCode: string): Promise<boolean> => {
  try {
    const data = await invoke('enable', { code: verificationCode });
    if (!data?.ok) throw new Error('Invalid verification code');
    logger.info('2FA enabled', 'TWO_FACTOR', { userId });
    return true;
  } catch (error) {
    errorHandler.handleError(error, 'enableTwoFactor');
    throw error;
  }
};

export const disableTwoFactor = async (userId: string, code: string): Promise<void> => {
  try {
    const data = await invoke('disable', { code });
    if (!data?.ok) throw new Error('Invalid verification code');
    logger.info('2FA disabled', 'TWO_FACTOR', { userId });
  } catch (error) {
    errorHandler.handleError(error, 'disableTwoFactor');
    throw error;
  }
};

export const getTwoFactorStatus = async (userId: string): Promise<TwoFactorStatus> => {
  try {
    const { data, error } = await supabase
      .from('user_two_factor')
      .select('enabled, backup_codes_remaining')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { enabled: false, backupCodesRemaining: 0 };
    return {
      enabled: (data as any).enabled ?? false,
      backupCodesRemaining: (data as any).backup_codes_remaining ?? 0,
    };
  } catch (error) {
    errorHandler.handleError(error, 'getTwoFactorStatus');
    return { enabled: false, backupCodesRemaining: 0 };
  }
};

export const regenerateBackupCodes = async (userId: string): Promise<string[]> => {
  try {
    const data = await invoke('regenerate');
    return (data?.backupCodes ?? []) as string[];
  } catch (error) {
    errorHandler.handleError(error, 'regenerateBackupCodes');
    throw error;
  }
};

// Per-session verification gate. Session-scoped so 2FA must be presented once per browser session.
const GATE_KEY = 'doc_2fa_verified_session';

export const isTwoFactorVerifiedThisSession = (sessionId?: string | null): boolean => {
  if (!sessionId) return false;
  try {
    return sessionStorage.getItem(GATE_KEY) === sessionId;
  } catch { return false; }
};

export const markTwoFactorVerifiedThisSession = (sessionId?: string | null) => {
  if (!sessionId) return;
  try { sessionStorage.setItem(GATE_KEY, sessionId); } catch { /* ignore */ }
};

export const clearTwoFactorSessionGate = () => {
  try { sessionStorage.removeItem(GATE_KEY); } catch { /* ignore */ }
};
