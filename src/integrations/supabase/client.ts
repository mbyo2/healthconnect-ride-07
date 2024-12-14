import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = 'https://tthzcijscedgxjfnfnky.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI1NzM2MDAsImV4cCI6MjAxODE0OTYwMH0.GG5UMtF8OxiQaXVPHjMVBWpVvM4P_BBGxhDqFfUlWxo';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    storageKey: 'supabase.auth.token'
  }
});