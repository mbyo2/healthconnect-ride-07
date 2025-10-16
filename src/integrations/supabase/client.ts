// Prefer providing these values via environment variables for local dev and Netlify.
// Vite exposes env via import.meta.env.VITE_*
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fallback to the values previously generated if env vars are not present.
const SUPABASE_URL = envUrl ?? "https://tthzcijscedgxjfnfnky.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = envAnon ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY";

if (!envUrl || !envAnon) {
	// Log a visible warning in the console at runtime so developers know to set env vars
	// (this will appear in the browser console when the app loads).
	// Avoid throwing so CI or Netlify builds that rely on env vars can still use fallbacks.
	// eslint-disable-next-line no-console
	console.warn('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Falling back to embedded values. For security, set these as environment variables (e.g. Netlify).');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);