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
      // NOTE: the status CHECK has no 'active' value — dispensed/usable
      // prescriptions are 'pending', 'filled' or 'partially_filled'.
      .in('status', ['pending', 'filled', 'partially_filled']);
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

export interface AllergyMatch {
  medication: string;
  allergen: string;
}

/**
 * Fetch the patient's recorded allergies from the institution patient registry.
 * Returns a list of allergen strings (may be comma/semicolon separated in storage).
 * Safe — never throws, returns [] on failure.
 */
export async function getPatientAllergies(patientId: string): Promise<string[]> {
  if (!patientId) return [];
  try {
    const { data } = await (supabase.from('institution_patient_registry' as any) as any)
      .select('allergies')
      .eq('linked_patient_id', patientId)
      .limit(1)
      .maybeSingle();
    const raw = (data as any)?.allergies as string | null;
    if (!raw) return [];
    return raw.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Check prescribed medication names against the patient's known allergies.
 * Matches when the medication name contains (or is contained in) an allergen term,
 * e.g. allergen "penicillin" matches "Amoxicillin" via common stems is NOT attempted —
 * this is a conservative substring match; clinicians confirm.
 * Safe — never throws.
 */
export function checkAllergyMatches(
  medicationNames: string[],
  allergies: string[],
): AllergyMatch[] {
  const meds = medicationNames.map(norm).filter(Boolean);
  const allergens = allergies.map(norm).filter(Boolean);
  if (!meds.length || !allergens.length) return [];
  const matches: AllergyMatch[] = [];
  for (const med of meds) {
    for (const allergen of allergens) {
      if (allergen.length < 3) continue;
      if (med.includes(allergen) || allergen.includes(med)) {
        const originalMed = medicationNames[meds.indexOf(med)];
        const originalAllergen = allergies[allergens.indexOf(allergen)];
        matches.push({ medication: originalMed, allergen: originalAllergen });
      }
    }
  }
  return matches;
}

export function summarizeAllergies(matches: AllergyMatch[]): string {
  if (!matches.length) return '';
  return matches
    .map(m => `ALLERGY ALERT: ${m.medication} may conflict with recorded allergy "${m.allergen}"`)
    .join('\n');
}
