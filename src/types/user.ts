
export type UserRole = 'patient' | 'health_personnel' | 'admin' | 'pharmacy';
export type AdminLevel = 'admin' | 'superadmin' | null;

export interface User {
  id: string;
  email: string;
  role?: UserRole;
  admin_level?: AdminLevel;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone_number?: string;
}
