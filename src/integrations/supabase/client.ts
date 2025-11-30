import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// For local development, we'll use the production Supabase URL
// In production, these will be set via environment variables in Netlify
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use Supabase URL and key from environment variables only
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the environment for debugging
console.log('Running in', isLocalhost ? 'local' : 'production', 'mode');

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: isLocalhost, // Enable debug logs in development
    },
    global: {
      headers: {
        'X-Client-Info': 'healthconnect-web/1.0.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
      },
    },
  }
);

// Log the Supabase URL and key prefix for debugging
if (import.meta.env.DEV) {
  console.log('Supabase URL configured:', Boolean(SUPABASE_URL));
  console.log('Supabase Key configured:', Boolean(SUPABASE_ANON_KEY));
}