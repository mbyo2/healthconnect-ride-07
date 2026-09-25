import { supabase } from '@/integrations/supabase/client';

/**
 * Recomputes the legacy profiles.admin_level column from the user's roles in
 * public.user_roles. Role checks in RLS use has_role() against user_roles
 * directly, but older UI code still reads profiles.admin_level, so this keeps
 * the denormalized column in sync whenever roles change through the UI.
 *
 * Best-effort: failures are swallowed so a sync problem can never break
 * the role grant/revoke itself. Only superadmins can UPDATE other users'
 * profiles, which is exactly the case that matters (only superadmins can
 * grant the admin / super_admin roles).
 */
export async function syncAdminLevel(userId: string): Promise<void> {
  try {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (rolesError) return;

    const roleNames = (roles || []).map((r: { role: string }) => r.role);
    const adminLevel = roleNames.includes('super_admin')
      ? 'superadmin'
      : roleNames.includes('admin')
        ? 'admin'
        : null;

    await supabase
      .from('profiles')
      .update({ admin_level: adminLevel })
      .eq('id', userId);
  } catch {
    // never break role management over a denormalized-column sync
  }
}
