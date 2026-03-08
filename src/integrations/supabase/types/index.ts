import type { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// Re-export the canonical UserRole from types/user.ts to avoid duplication
export type { UserRole } from '@/types/user';

export interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  role: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_profile_complete?: boolean | null;
}

export type { Database };