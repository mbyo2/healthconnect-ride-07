
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!session;

  useEffect(() => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      toast.success('Signed in successfully');
      
      // Log security event
      await logSecurityEvent('sign_in');
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      if (error) throw error;
      toast.success('Account created! Please check your email for confirmation');
      
      // Log security event
      await logSecurityEvent('sign_up');
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
      await logSecurityEvent('sign_out');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
    // This is a placeholder implementation
    // In a real app, this would validate the 2FA code against the stored secret
    try {
      // For demo purposes, we're just checking if the code is 6 digits
      if (!/^\d{6}$/.test(code)) {
        toast.error('Invalid verification code');
        return false;
      }
      
      // Log security event
      await logSecurityEvent('two_factor_verified');
      
      return true;
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      toast.error('Failed to verify two-factor code');
      return false;
    }
  };
  
  const setupTwoFactor = async (): Promise<{ secret: string; backupCodes: string[] }> => {
    // This is a placeholder implementation
    // In a real app, this would generate a 2FA secret and QR code URL
    try {
      // Generate mock secret and backup codes
      const mockSecret = Math.random().toString(36).substring(2, 15);
      const mockBackupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      
      // Log security event
      await logSecurityEvent('two_factor_setup_initiated');
      
      return {
        secret: mockSecret,
        backupCodes: mockBackupCodes
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      toast.error('Failed to setup two-factor authentication');
      throw error;
    }
  };
  
  const disableTwoFactor = async (): Promise<void> => {
    // This is a placeholder implementation
    // In a real app, this would disable 2FA on the user's account
    try {
      // Log security event
      await logSecurityEvent('two_factor_disabled');
      
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast.error('Failed to disable two-factor authentication');
      throw error;
    }
  };
  
  const logSecurityEvent = async (action: string, details?: any): Promise<void> => {
    // This is a placeholder implementation
    // In a real app, this would log security events to a database
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const eventData = {
        user_id: session.user.id,
        action,
        timestamp: new Date().toISOString(),
        ip_address: "127.0.0.1", // In a real app, this would be the actual IP
        user_agent: navigator.userAgent,
        details
      };
      
      console.log("Security event logged:", eventData);
      
      // In a real implementation, this would insert into an audit_logs table
      // const { error } = await supabase.from('audit_logs').insert(eventData);
      // if (error) throw error;
    } catch (error) {
      console.error('Error logging security event:', error);
    }
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
