
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// Secure token handling
const TOKEN_STORAGE_KEY = 'doc-o-clock-auth-token';
const REFRESH_TOKEN_STORAGE_KEY = 'doc-o-clock-refresh-token';

// Helper function to securely store tokens
const securelyStoreTokens = (session: Session | null) => {
  if (!session) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    return;
  }
  
  try {
    // Store access token in sessionStorage for better security
    // (cleared when browser is closed)
    sessionStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
    
    // Store refresh token in localStorage for persistence
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refresh_token);
  } catch (error) {
    console.error('Error storing tokens:', error);
  }
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Securely store tokens
  securelyStoreTokens(data.session);
};

export const signUp = async (email: string, password: string, userData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  
  if (error) throw error;
  
  // Store tokens if session is available immediately
  if (data.session) {
    securelyStoreTokens(data.session);
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({
    scope: 'global' // Sign out from all devices
  });
  
  // Clear tokens regardless of signOut result
  securelyStoreTokens(null);
  
  if (error) throw error;
};

export const refreshSession = async () => {
  // Try to get refresh token from storage
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });
  
  if (error) throw error;
  
  // Update stored tokens
  securelyStoreTokens(data.session);
  
  return data;
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) throw error;
  
  // Update stored tokens if session exists
  if (data.session) {
    securelyStoreTokens(data.session);
  }
  
  return data;
};

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const verifyBiometricSupport = async () => {
  // Check if Web Authentication API is available
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'Web Authentication API not supported' };
  }
  
  // Check if biometric authentication is available
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return { 
      supported: available,
      reason: available ? null : 'Platform authenticator not available'
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return { supported: false, reason: 'Error checking biometric support' };
  }
};

export const setupBiometricAuth = async (userId: string) => {
  // This is a placeholder for actual biometric registration
  // In a real implementation, you would:
  // 1. Generate a challenge from your server
  // 2. Create credentials using navigator.credentials.create()
  // 3. Send the credential to your server for storage
  
  return { success: true, message: 'Biometric authentication setup' };
};

export const signInWithBiometrics = async () => {
  // This is a placeholder for actual biometric authentication
  // In a real implementation, you would:
  // 1. Get a challenge from your server
  // 2. Use navigator.credentials.get() to authenticate
  // 3. Send the authentication result to your server
  
  return { success: true, message: 'Biometric authentication successful' };
};

// Mobile-specific auth helpers
export const isPlatformCapacitor = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

export const storeAuthInSecureStorage = async (session: Session | null) => {
  if (!isPlatformCapacitor()) return;
  
  try {
    const { Plugins } = (window as any).Capacitor;
    if (Plugins.Storage) {
      if (session) {
        await Plugins.Storage.set({
          key: 'auth-session',
          value: JSON.stringify(session)
        });
      } else {
        await Plugins.Storage.remove({ key: 'auth-session' });
      }
    }
  } catch (error) {
    console.error('Error storing in secure storage:', error);
  }
};

export const getAuthFromSecureStorage = async () => {
  if (!isPlatformCapacitor()) return null;
  
  try {
    const { Plugins } = (window as any).Capacitor;
    if (Plugins.Storage) {
      const { value } = await Plugins.Storage.get({ key: 'auth-session' });
      return value ? JSON.parse(value) : null;
    }
  } catch (error) {
    console.error('Error retrieving from secure storage:', error);
  }
  return null;
};

export const checkForExistingSession = async () => {
  // First check secure storage if on a mobile device
  if (isPlatformCapacitor()) {
    const storedSession = await getAuthFromSecureStorage();
    if (storedSession) {
      // Verify the token is still valid
      try {
        const { data, error } = await supabase.auth.getUser(storedSession.access_token);
        if (!error && data.user) {
          return storedSession;
        }
      } catch (err) {
        console.error('Error verifying stored session:', err);
      }
    }
  }
  
  // Fall back to browser session
  return getSession();
};
