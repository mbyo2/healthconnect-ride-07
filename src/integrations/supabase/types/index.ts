import type { Database } from './database';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type UserRole = 'patient' | 'health_personnel' | 'admin' | 'institution_admin' | 'pharmacy' | 'institution_staff' | 'lab' | 'super_admin' | 'support' | 'doctor' | 'nurse' | 'radiologist' | 'pharmacist' | 'lab_technician' | 'receptionist' | 'hr_manager' | 'cxo' | 'ot_staff' | 'phlebotomist' | 'billing_staff' | 'inventory_manager' | 'triage_staff' | 'maintenance_manager' | 'specialist' | 'ambulance_staff' | 'pathologist';

export interface Profile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  created_at?: string | null;
  updated_at?: string | null;
  is_profile_complete?: boolean | null;
}

export type { Database };