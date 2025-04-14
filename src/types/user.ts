
export type UserRole = 'admin' | 'health_personnel' | 'patient' | 'superadmin';

export type AdminLevel = 'admin' | 'superadmin' | null;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  admin_level?: AdminLevel;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  avatar_url?: string;
  wallet_balance?: number;
  default_payment_method?: string;
}
