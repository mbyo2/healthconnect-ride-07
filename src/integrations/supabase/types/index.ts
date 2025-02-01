import { Database } from './database';

export type Tables = Database['public']['Tables'];
export type UserRole = 'admin' | 'health_personnel' | 'patient';

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  bio?: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
  is_profile_complete?: boolean;
}

export * from './communication';
export * from './generated';