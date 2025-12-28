import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  userRole: string | null;
  isLoading: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to load cached profile first for instant load
    const cachedProfile = localStorage.getItem('doc_oclock_profile');
    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch (e) {
        console.error('Error parsing cached profile', e);
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only synchronous state updates here
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Fetch profile in a separate call to avoid auth deadlock
        if (currentSession?.user) {
          setTimeout(() => {
            fetchProfile(currentSession.user.id);
          }, 0);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          localStorage.removeItem('doc_oclock_profile');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // If we have a cached profile, we can stop loading immediately
        // and let the fresh profile fetch happen in the background
        if (localStorage.getItem('doc_oclock_profile')) {
          setIsLoading(false);
          fetchProfile(currentSession.user.id); // Fetch fresh data in background
        } else {
          await fetchProfile(currentSession.user.id);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    if (!userId) return;

    try {
      // Fetch profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error(`Error fetching profile (attempt ${retryCount + 1}):`, profileError);
        // Retry with exponential backoff
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000 * Math.pow(2, retryCount));
        }
        return;
      }

      // Fetch user's primary role from user_roles table using secure function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', { _user_id: userId });

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      if (profileData) {
        const fullProfile = {
          ...profileData,
          role: roleData || profileData.role || 'patient', // Use role from user_roles table or fallback to profile role
        };
        setProfile(fullProfile);
        localStorage.setItem('doc_oclock_profile', JSON.stringify(fullProfile));
      } else {
        // If no profile exists, create a basic one
        console.log('No profile found, creating basic profile for:', userId);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userEmail = currentUser?.email;

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            is_profile_complete: false,
            role: 'patient' // Default role for new profiles
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          // Retry profile creation if it failed
          if (retryCount < 2) {
            setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
          }
        } else {
          // Fetch the newly created profile
          const { data: newProfile, error: fetchNewError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (newProfile) {
            setProfile({
              ...newProfile,
              role: roleData || 'patient'
            });
            localStorage.setItem('doc_oclock_profile', JSON.stringify({
              ...newProfile,
              role: roleData || 'patient'
            }));
          } else if (fetchNewError) {
            console.error('Error fetching newly created profile:', fetchNewError);
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error in fetchProfile:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData = {}) => {
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData }
      });

      // eslint-disable-next-line no-console
      console.debug('AuthContext signUp response:', response);

      if (response.error) {
        return { error: response.error, data: null };
      }

      return { data: response.data, error: null };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error, data: null };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
      console.error('Error signing out:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole: profile?.role || null,
    isLoading,
    loading: isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
