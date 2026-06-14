import { supabase } from '@/integrations/supabase/client';

export type InteractionSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor' | 'unknown';

export interface DrugInteraction {
  id: string;
  drug_a: string;
  drug_b: string;
  severity: InteractionSeverity;
  interaction_type: string | null;
  description: string | null;
  clinical_effect: string | null;
  management: string | null;
}

const norm = (s: string) => (s || '').trim().toLowerCase();

/**
 * Check `candidateDrug` against a list of `existingDrugs`. Returns interactions
 * sorted by severity (most severe first). Safe — never throws.
 */
export async function checkInteractions(
  candidateDrug: string,
  existingDrugs: string[],
): Promise<DrugInteraction[]> {
  const candidate = norm(candidateDrug);
  const others = Array.from(new Set(existingDrugs.map(norm).filter(Boolean)));
  if (!candidate || others.length === 0) return [];

  try {
    const { data, error } = await (supabase.from('drug_interactions' as any) as any)
      .select('*')
      .or(`drug_a.ilike.%${candidate}%,drug_b.ilike.%${candidate}%`);
    if (error || !data) return [];
    const rank: Record<string, number> = {
      contraindicated: 0, major: 1, moderate: 2, minor: 3, unknown: 4,
    };
    return (data as DrugInteraction[])
      .filter(row => {
        const a = norm(row.drug_a); const b = norm(row.drug_b);
        const matchesCandidate = a.includes(candidate) || b.includes(candidate) || candidate.includes(a) || candidate.includes(b);
        if (!matchesCandidate) return false;
        return others.some(o => a.includes(o) || b.includes(o) || o.includes(a) || o.includes(b));
      })
      .sort((x, y) => (rank[x.severity] ?? 9) - (rank[y.severity] ?? 9));
  } catch (e) {
    console.warn('drug-interaction lookup failed', e);
    return [];
  }
}

export async function getPatientActiveMedications(patientId: string): Promise<string[]> {
  if (!patientId) return [];
  try {
    const { data } = await (supabase.from('comprehensive_prescriptions' as any) as any)
      .select('medication_name, generic_name')
      .eq('patient_id', patientId)
      .eq('status', 'active');
    const names = (data || []).flatMap((r: any) => [r.medication_name, r.generic_name]).filter(Boolean);
    return Array.from(new Set(names));
  } catch {
    return [];
  }
}

export function isBlocking(severity: InteractionSeverity) {
  return severity === 'contraindicated' || severity === 'major';
}

export function summarize(interactions: DrugInteraction[]): string {
  if (!interactions.length) return '';
  return interactions
    .slice(0, 3)
    .map(i => `${i.severity.toUpperCase()}: ${i.drug_a} ↔ ${i.drug_b}${i.clinical_effect ? ` — ${i.clinical_effect}` : ''}`)
    .join('\n');
}
