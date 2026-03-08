// Re-export UserRole from the single source of truth
export type { UserRole } from '@/config/roleConfig';

export type AdminLevel = 'admin' | 'superadmin' | null;

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  admin_level?: AdminLevel;
  avatar_url?: string;
  is_profile_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
}
