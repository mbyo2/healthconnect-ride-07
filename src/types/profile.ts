import type { Database } from '@/integrations/supabase/types';

/** Row type from the profiles table, extended with the resolved role from user_roles */
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  /** Primary role resolved from user_roles table (not the profiles.role column) */
  role: string;
};
