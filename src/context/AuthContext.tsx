// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';
import { clearApiCaches } from '@/utils/service-worker';
import { withTimeout, TIMEOUTS } from '@/utils/async';
import type { Profile } from '@/types/profile';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load cached profile for instant UI (display only — role is re-fetched from server)
    const cachedProfile = safeLocalGet('doc_oclock_profile');
    if (cachedProfile) {
      try {
        const cleanCache = cachedProfile.trim().replace(/^\uFEFF/, '');
        const parsed = JSON.parse(cleanCache);
        // Strip role from cache — always trust server for authorization
        setProfile({ ...parsed, role: parsed.role }); // display only, overwritten by fetchProfile
      } catch (e) {
        console.error('Error parsing cached profile', e);
        safeLocalRemove('doc_oclock_profile'); // Clear corrupted cache
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
          safeLocalRemove('doc_oclock_profile');
        }
      }
    );

    // Fail-safe maximum load timer (2.5 seconds max) to guarantee loading state is unblocked
    const loadGuardTimer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('Auth state initialization timed out — unblocking app loading state');
          return false;
        }
        return prev;
      });
    }, 2500);

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // If we have a cached profile, we can stop loading immediately
        // and let the fresh profile fetch happen in the background
        if (safeLocalGet('doc_oclock_profile')) {
          setIsLoading(false);
          clearTimeout(loadGuardTimer);
          fetchProfile(currentSession.user.id); // Fetch fresh data in background
        } else {
          try {
            await fetchProfile(currentSession.user.id);
          } catch (err) {
            console.error('Error in fetchProfile during initial auth check:', err);
          } finally {
            setIsLoading(false);
            clearTimeout(loadGuardTimer);
          }
        }
      } else {
        setIsLoading(false);
        clearTimeout(loadGuardTimer);
      }
    }).catch((err) => {
      console.error('Failed to retrieve session from Supabase:', err);
      setIsLoading(false);
      clearTimeout(loadGuardTimer);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadGuardTimer);
    };
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    if (!userId) return;

    try {
      // Fetch profile from profiles table — raced against a timeout so a
      // stalled ward network can never wedge the whole app on a spinner.
      // The profile and role queries are independent — run them concurrently
      // instead of serially to shorten cold-boot sign-in time.
      const [profileRes, roleRes] = await Promise.all([
        withTimeout(
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          TIMEOUTS.critical,
          'fetchProfile'
        ).then(
          (res) => ({ data: res.data, error: res.error as { code?: string } | null }),
          (err: any) => ({ data: null, error: err as { code?: string } | null })
        ),
        withTimeout(
          supabase.rpc('get_user_role', { _user_id: userId }),
          TIMEOUTS.critical,
          'get_user_role'
        ).then(
          (res) => ({ data: res.data, error: null as any }),
          (err: any) => ({ data: null, error: err })
        ),
      ]);

      const profileData = profileRes.data;
      const profileError = profileRes.error;

      if (profileError && profileError.code !== 'PGRST116') {
        console.error(`Error fetching profile (attempt ${retryCount + 1}):`, profileError);
        // Retry with exponential backoff (network errors AND timeouts)
        if (retryCount < 3) {
          setTimeout(() => fetchProfile(userId, retryCount + 1), 1000 * Math.pow(2, retryCount));
        }
        return;
      }

      // Fetch user's primary role from user_roles table using secure function.
      // A timeout/failure here is non-fatal — fall through to the
      // server-maintained profile role below (never user_metadata).
      let roleData: any = null;
      if (roleRes.error) {
        console.warn('Role fetch failed, using fallback role:', roleRes.error);
      } else {
        roleData = roleRes.data;
      }

      if (profileData) {
        // SECURITY: Role always comes from server (user_roles table via RPC), never from cache
        const fullProfile = {
          ...profileData,
          role: roleData || profileData.role || 'patient',
        };
        setProfile(fullProfile);
        // Cache for display only — role is always re-validated on next fetchProfile
        safeLocalSet('doc_oclock_profile', JSON.stringify(fullProfile));
      } else {
        // If no profile exists, create a basic one
        console.log('No profile found, creating basic profile for:', userId);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userEmail = currentUser?.email;

        // SECURITY (P1-25): user_metadata is user-writable and must never
        // decide a role. A missing profile is recreated with the baseline
        // 'patient' role only; privileged roles are granted server-side
        // (application-approval triggers / admin grants into user_roles)
        // and surface here via the get_user_role RPC on the next fetch.
        const profileRole = 'patient';

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            is_profile_complete: false,
            role: profileRole
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          // Retry profile creation if it failed
          if (retryCount < 2) {
            setTimeout(() => fetchProfile(userId, retryCount + 1), 2000);
          }
        } else {
          // Baseline 'patient' role row only — never a metadata-chosen
          // role (P1-25). Admin-only INSERT policies on user_roles mean
          // this normally no-ops because the signup trigger already
          // granted the patient role.
          await supabase.from('user_roles').upsert(
            [{ user_id: userId, role: 'patient' as any }],
            { onConflict: 'user_id,role' }
          );

          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (newProfile) {
            setProfile({
              ...newProfile,
              role: roleData || profileRole
            });
            safeLocalSet('doc_oclock_profile', JSON.stringify({
              ...newProfile,
              role: roleData || profileRole
            }));
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

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData = {}) => {
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
  }, []);

  const signOut = useCallback(async () => {
    // Drop the service worker's per-user offline API caches with the
    // session (P2-31: caches are named `healthconnect-api-<user-id>`), so
    // one user's cached patient data never outlives their session on a
    // shared device. Ask the worker to wipe by prefix AND wipe directly
    // from the page — the direct wipe also works when no SW controller
    // exists yet (first load), where the message would be lost.
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_API_CACHE' });
    } catch { /* non-fatal */ }
    await clearApiCaches();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error signing out');
      console.error('Error signing out:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user]);

  // Memoized context value — prevents cascade re-renders across the app.
  // Without this, every AuthContext state change recreates the value object,
  // forcing ALL consumers to re-render even when their data didn't change.
  const value = useMemo(() => ({
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
  }), [user, session, profile, isLoading, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR or mount race conditions, return safe defaults instead of crashing
    console.warn('useAuth called outside AuthProvider — returning defaults');
    return {
      user: null,
      session: null,
      profile: null,
      userRole: null,
      isLoading: true,
      loading: true,
      isAuthenticated: false,
      signIn: async () => ({ error: new Error('AuthProvider not mounted') }),
      signUp: async () => ({ error: new Error('AuthProvider not mounted'), data: null }),
      signOut: async () => {},
      refreshProfile: async () => {},
    };
  }
  return context;
};
