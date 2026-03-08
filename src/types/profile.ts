import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/** 
 * Profile type extended with the resolved role from user_roles table.
 * The `role` field is widened to `string` because the user_roles table
 * uses the app_role enum (13 values) while profiles.role uses user_role enum (3 values).
 * Additional fields may be present from profile extensions.
 */
export type Profile = Omit<ProfileRow, 'role'> & {
  role: string;
  /** Fields that may exist on extended profiles (e.g. emergency data) */
  blood_type?: string | null;
  allergies?: string[] | null;
  medical_conditions?: string[] | null;
  current_medications?: string[] | null;
  [key: string]: unknown;
};
