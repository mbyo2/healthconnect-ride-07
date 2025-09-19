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
    
    // Additional check for conditional mediation support
    const conditionalSupported = await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
    
    return { 
      supported: available,
      conditionalSupported,
      reason: available ? null : 'Platform authenticator not available'
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return { supported: false, reason: 'Error checking biometric support' };
  }
};

export const setupBiometricAuth = async (userId: string) => {
  try {
    // Check biometric support first
    const support = await verifyBiometricSupport();
    if (!support.supported) {
      throw new Error(support.reason || 'Biometric authentication not supported');
    }

    // Generate a challenge from the server
    const { data: challengeData, error: challengeError } = await supabase
      .from('biometric_challenges')
      .insert({ user_id: userId, challenge: generateChallenge() })
      .select()
      .single();

    if (challengeError) throw challengeError;

    // Create credential options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: new TextEncoder().encode(challengeData.challenge),
      rp: {
        name: "HealthConnect",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: `user-${userId}`,
        displayName: "HealthConnect User",
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "direct"
    };

    // Create the credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create biometric credential');
    }

    // Store credential in database
    const { error: storeError } = await supabase
      .from('user_biometric_credentials')
      .insert({
        user_id: userId,
        credential_id: credential.id,
        public_key: arrayBufferToBase64(credential.response.publicKey),
        counter: 0,
        created_at: new Date().toISOString(),
      });

    if (storeError) throw storeError;

    // Clean up challenge
    await supabase
      .from('biometric_challenges')
      .delete()
      .eq('id', challengeData.id);

    return { 
      success: true, 
      credentialId: credential.id,
      message: 'Biometric authentication setup successfully' 
    };

  } catch (error) {
    console.error('Biometric setup error:', error);
    throw error;
  }
};

export const signInWithBiometrics = async (email?: string) => {
  try {
    // Check biometric support
    const support = await verifyBiometricSupport();
    if (!support.supported) {
      throw new Error(support.reason || 'Biometric authentication not supported');
    }

    // Get stored credentials for the user
    let credentialQuery = supabase.from('user_biometric_credentials').select('*');
    
    if (email) {
      // If email provided, get user first then credentials
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (userError) throw userError;
      credentialQuery = credentialQuery.eq('user_id', userData.id);
    }

    const { data: credentials, error: credError } = await credentialQuery;
    if (credError) throw credError;

    if (!credentials || credentials.length === 0) {
      throw new Error('No biometric credentials found. Please set up biometric authentication first.');
    }

    // Generate authentication challenge
    const challenge = generateChallenge();
    const allowCredentials = credentials.map(cred => ({
      id: base64ToArrayBuffer(cred.credential_id),
      type: "public-key" as const,
    }));

    // Create authentication options
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: new TextEncoder().encode(challenge),
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    };

    // Get the credential
    const credential = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Biometric authentication failed');
    }

    // Verify the credential with stored data
    const storedCred = credentials.find(c => c.credential_id === credential.id);
    if (!storedCred) {
      throw new Error('Invalid credential');
    }

    // Update counter and last used
    await supabase
      .from('user_biometric_credentials')
      .update({
        counter: storedCred.counter + 1,
        last_used: new Date().toISOString(),
      })
      .eq('id', storedCred.id);

    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: storedCred.user_email || email || '',
      password: 'biometric-auth-bypass', // Special handling needed on backend
    });

    if (authError) {
      // Alternative: use admin auth or custom JWT for biometric users
      throw new Error('Biometric authentication verified but session creation failed');
    }

    securelyStoreTokens(authData.session);

    return {
      success: true,
      session: authData.session,
      message: 'Biometric authentication successful'
    };

  } catch (error) {
    console.error('Biometric authentication error:', error);
    throw error;
  }
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

// Helper functions for biometric authentication
const generateChallenge = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// TODO: Strengthen session management and security notifications
// TODO: Ensure all sensitive data is encrypted in transit and at rest
