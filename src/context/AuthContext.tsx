import * as React from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  signIn as authSignIn, 
  signUp as authSignUp, 
  signOut as authSignOut
} from '@/utils/auth-service';
import { 
  verifyTwoFactor as authVerifyTwoFactor, 
  setupTwoFactor as authSetupTwoFactor, 
  disableTwoFactor as authDisableTwoFactor 
} from '@/utils/two-factor-service';
import { logSecurityEvent as authLogSecurityEvent } from '@/utils/security-service';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  verifyTwoFactor: (code: string) => Promise<boolean>;
  setupTwoFactor: () => Promise<{ secret: string; backupCodes: string[] }>;
  disableTwoFactor: () => Promise<void>;
  logSecurityEvent: (action: string, details?: any) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const isAuthenticated = !!session;

  React.useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth event:', event);
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }
          
          setProfile(profileData);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await authSignIn(email, password);
      toast.success('Signed in successfully');
      
      // Log security event
      await authLogSecurityEvent('sign_in');
    } catch (error: any) {
      toast.error(error.message || 'Error signing in');
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      setIsLoading(true);
      await authSignUp(email, password, userData);
      toast.success('Account created! Please check your email for confirmation');
      
      // Log security event
      await authLogSecurityEvent('sign_up');
    } catch (error: any) {
      toast.error(error.message || 'Error creating account');
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Log security event before signing out
      await authLogSecurityEvent('sign_out');
      
      await authSignOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Error signing out');
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Two-factor authentication functions
  const verifyTwoFactor = async (code: string): Promise<boolean> => {
    try {
      const result = await authVerifyTwoFactor(code);
      
      if (result) {
        // Log security event
        await authLogSecurityEvent('two_factor_verified');
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      toast.error('Failed to verify two-factor code');
      return false;
    }
  };
  
  const setupTwoFactor = async (): Promise<{ secret: string; backupCodes: string[] }> => {
    try {
      const result = await authSetupTwoFactor();
      
      // Log security event
      await authLogSecurityEvent('two_factor_setup_initiated');
      
      return result;
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast.error('Failed to setup two-factor authentication');
      throw error;
    }
  };
  
  const disableTwoFactor = async (): Promise<void> => {
    try {
      await authDisableTwoFactor();
      
      // Log security event
      await authLogSecurityEvent('two_factor_disabled');
      
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable two-factor authentication');
      throw error;
    }
  };
  
  const logSecurityEvent = async (action: string, details?: any): Promise<void> => {
    await authLogSecurityEvent(action, details);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        isAuthenticated,
        verifyTwoFactor,
        setupTwoFactor,
        disableTwoFactor,
        logSecurityEvent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
