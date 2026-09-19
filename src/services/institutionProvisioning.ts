/**
 * Institution workspace provisioning
 * ------------------------------------------------------------------
 * "Everything done for them at signup": the moment an institution record
 * exists (registration form OR auto-provisioning), its HMS workspace is
 * seeded with the departments its facility archetype expects — OPD desks,
 * wards, theatre, lab benches, dispensary counters — so queues, beds and
 * billing work from day one with zero manual setup.
 *
 * HMS-only facilities (list_in_marketplace = false) get the exact same
 * workspace; the marketplace flag only controls public visibility.
 */
import { supabase } from '@/integrations/supabase/client';
import { getFacilityArchetype, DEFAULT_DEPARTMENTS } from '@/config/facilityProfiles';

export interface ProvisionResult {
  departmentsCreated: number;
  skipped: boolean;
  error?: string;
}

/**
 * Seed default departments for an institution. Idempotent — if the
 * institution already has departments, nothing is inserted.
 */
export async function provisionInstitutionWorkspace(
  institutionId: string,
  institutionType?: string | null
): Promise<ProvisionResult> {
  if (!institutionId) return { departmentsCreated: 0, skipped: true, error: 'Missing institution id' };

  try {
    const archetype = getFacilityArchetype(institutionType);
    const defaults = DEFAULT_DEPARTMENTS[archetype] ?? [];

    // Idempotency guard — never duplicate seed rows
    const { data: existing, error: checkError } = await supabase
      .from('hospital_departments' as any)
      .select('id')
      .eq('hospital_id', institutionId)
      .limit(1);

    if (checkError) throw checkError;
    if (existing && existing.length > 0) return { departmentsCreated: 0, skipped: true };

    if (defaults.length === 0) return { departmentsCreated: 0, skipped: true };

    const rows = defaults.map((d) => ({
      hospital_id: institutionId,
      name: d.name,
      code: d.code,
      description: d.description ?? null,
      bed_capacity: 0,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from('hospital_departments' as any)
      .insert(rows);

    if (insertError) throw insertError;

    return { departmentsCreated: rows.length, skipped: false };
  } catch (err: any) {
    // Provisioning must never break signup — the workspace simply starts
    // empty and departments can be added later from HMS → Staff/Departments.
    console.error('Institution provisioning failed (non-fatal):', err);
    return { departmentsCreated: 0, skipped: true, error: err?.message || 'Provisioning failed' };
  }
}
