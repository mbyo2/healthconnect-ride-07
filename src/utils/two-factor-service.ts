import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler';
import { logger } from './logger';

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
  lastUsed?: Date;
}

export const generateSecret = (): string => {
  // Generate a 32-character base32 secret
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

// Simple TOTP verification function
const verifyTOTP = (token: string, secret: string): boolean => {
  // For production, implement proper TOTP algorithm
  // This is a simplified version for demonstration
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  const expectedToken = generateTOTP(secret, timeStep);
  const previousToken = generateTOTP(secret, timeStep - 1);
  
  return token === expectedToken || token === previousToken;
};

const generateTOTP = (secret: string, timeStep: number): string => {
  // Simplified TOTP generation - in production use proper HMAC-SHA1
  const hash = simpleHash(secret + timeStep.toString());
  return (hash % 1000000).toString().padStart(6, '0');
};

const simpleHash = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

export const generateBackupCodes = (): string[] => {
  return Array.from({ length: 10 }, () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    return code.match(/.{1,4}/g)?.join('-') || code;
  });
};

export const setupTwoFactor = async (userId: string): Promise<TwoFactorSetup> => {
  try {
    logger.info('Setting up 2FA', 'TWO_FACTOR', { userId });
    
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();
    
    // Create QR code URL for authenticator apps
    const qrCodeUrl = `otpauth://totp/HealthConnect:Account?secret=${secret}&issuer=HealthConnect&algorithm=SHA1&digits=6&period=30`;
    const manualEntryKey = secret.replace(/(.{4})/g, '$1 ').trim();

    // Store 2FA setup in database (not yet enabled)
    const { error } = await supabase
      .from('user_two_factor')
      .upsert({
        user_id: userId,
        secret: secret,
        backup_codes: backupCodes,
        enabled: false,
        setup_at: new Date().toISOString(),
      });

    if (error) {
      errorHandler.handleError(error, 'setupTwoFactor');
      throw new Error('Failed to setup 2FA');
    }

    logger.info('2FA setup completed', 'TWO_FACTOR', { userId });

    return {
      secret,
      qrCodeUrl,
      backupCodes,
      manualEntryKey,
    };
  } catch (error) {
    errorHandler.handleError(error, 'setupTwoFactor');
    throw error;
  }
};

export const verifyTwoFactor = async (userId: string, code: string): Promise<boolean> => {
  try {
    logger.info('Verifying 2FA code', 'TWO_FACTOR', { userId });

    if (!/^\d{6}$/.test(code)) {
      throw new Error('Invalid verification code format');
    }

    // Get user's 2FA secret
    const { data: twoFactorData, error } = await supabase
      .from('user_two_factor')
      .select('secret, backup_codes, enabled')
      .eq('user_id', userId)
      .single();

    if (error || !twoFactorData) {
      throw new Error('2FA not set up for this user');
    }

    // Check if it's a backup code
    if (twoFactorData.backup_codes.includes(code)) {
      // Remove used backup code
      const updatedBackupCodes = twoFactorData.backup_codes.filter((c: string) => c !== code);
      
      await supabase
        .from('user_two_factor')
        .update({ 
          backup_codes: updatedBackupCodes,
          last_used: new Date().toISOString()
        })
        .eq('user_id', userId);

      logger.info('2FA verified with backup code', 'TWO_FACTOR', { userId });
      return true;
    }

    // Verify TOTP code using simplified algorithm
    const isValid = verifyTOTP(code, twoFactorData.secret);

    if (isValid) {
      // Update last used timestamp
      await supabase
        .from('user_two_factor')
        .update({ last_used: new Date().toISOString() })
        .eq('user_id', userId);

      logger.info('2FA verified successfully', 'TWO_FACTOR', { userId });
    } else {
      logger.warn('2FA verification failed', 'TWO_FACTOR', { userId });
    }

    return isValid;
  } catch (error) {
    errorHandler.handleError(error, 'verifyTwoFactor');
    throw error;
  }
};

export const enableTwoFactor = async (userId: string, verificationCode: string): Promise<boolean> => {
  try {
    logger.info('Enabling 2FA', 'TWO_FACTOR', { userId });

    const isValid = await verifyTwoFactor(userId, verificationCode);
    
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    // Enable 2FA
    const { error } = await supabase
      .from('user_two_factor')
      .update({ 
        enabled: true,
        enabled_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      errorHandler.handleError(error, 'enableTwoFactor');
      throw new Error('Failed to enable 2FA');
    }

    logger.info('2FA enabled successfully', 'TWO_FACTOR', { userId });
    return true;
  } catch (error) {
    errorHandler.handleError(error, 'enableTwoFactor');
    throw error;
  }
};

export const disableTwoFactor = async (userId: string, password: string): Promise<void> => {
  try {
    logger.info('Disabling 2FA', 'TWO_FACTOR', { userId });

    // Verify password before disabling 2FA
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: '', // This would need to be passed or retrieved
      password: password
    });

    if (authError) {
      throw new Error('Invalid password');
    }

    // Disable 2FA
    const { error } = await supabase
      .from('user_two_factor')
      .update({ 
        enabled: false,
        disabled_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      errorHandler.handleError(error, 'disableTwoFactor');
      throw new Error('Failed to disable 2FA');
    }

    logger.info('2FA disabled successfully', 'TWO_FACTOR', { userId });
  } catch (error) {
    errorHandler.handleError(error, 'disableTwoFactor');
    throw error;
  }
};

export const getTwoFactorStatus = async (userId: string): Promise<TwoFactorStatus> => {
  try {
    const { data, error } = await supabase
      .from('user_two_factor')
      .select('enabled, backup_codes, last_used')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { enabled: false, backupCodesRemaining: 0 };
    }

    return {
      enabled: data.enabled || false,
      backupCodesRemaining: data.backup_codes?.length || 0,
      lastUsed: data.last_used ? new Date(data.last_used) : undefined,
    };
  } catch (error) {
    errorHandler.handleError(error, 'getTwoFactorStatus');
    return { enabled: false, backupCodesRemaining: 0 };
  }
};

export const regenerateBackupCodes = async (userId: string): Promise<string[]> => {
  try {
    logger.info('Regenerating backup codes', 'TWO_FACTOR', { userId });

    const newBackupCodes = generateBackupCodes();

    const { error } = await supabase
      .from('user_two_factor')
      .update({ backup_codes: newBackupCodes })
      .eq('user_id', userId);

    if (error) {
      errorHandler.handleError(error, 'regenerateBackupCodes');
      throw new Error('Failed to regenerate backup codes');
    }

    logger.info('Backup codes regenerated', 'TWO_FACTOR', { userId });
    return newBackupCodes;
  } catch (error) {
    errorHandler.handleError(error, 'regenerateBackupCodes');
    throw error;
  }
};
