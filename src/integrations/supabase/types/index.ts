import type { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums = Database['public']['Enums'];
export type UserRole = Enums['user_role'];

export interface Profile extends Tables<'profiles'> {
  // Additional profile-specific types can be added here
}

export type { Database };
