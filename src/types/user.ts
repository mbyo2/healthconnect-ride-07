
export type UserRole = 'patient' | 'health_personnel' | 'admin' | 'institution_admin';
export type AdminLevel = 'admin' | 'superadmin' | null;

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
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
