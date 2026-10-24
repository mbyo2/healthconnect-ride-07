import { supabase } from '@/integrations/supabase/client';

// Live-schema note (verified 2026-10-24): drug_interactions columns are
// drug_a / drug_b / severity / interaction_type / description /
// clinical_effect / management, and its severity vocabulary in live data is
// 'severe' | 'moderate' | 'contraindicated' (older rows may use 'major' /
// 'minor'). patient_allergies uses allergen_name (not allergen). The
// patient's current-medication list is the `medications` table
// (user_id / name / is_active) plus comprehensive_prescriptions rows
// (medication_name / generic_name columns — there is no medications jsonb).

export type InteractionSeverity = 'contraindicated' | 'major' | 'severe' | 'moderate' | 'minor' | 'unknown';

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
 * Normalise a medication name for matching: lowercase/trim, strip a trailing
 * parenthetical brand note and any trailing dosage ("Amoxicillin 500mg" /
 * "Paracetamol 500 mg" / "Warfarin 5 mg"). Mirrors the SQL
 * public.normalize_drug_name used by the server-side safety gate.
 */
export function normalizeDrugName(name: string): string {
  let v = norm(name).replace(/\s+/g, ' ');
  v = v.replace(/\s*\([^)]*\)\s*$/, '');
  v = v.replace(/\s+\d+(\.\d+)?\s*(mg|mcg|ug|g|ml|l|iu|units?|%|mg\/ml|mcg\/ml).*$/, '');
  v = v.replace(/\s+\d+(\.\d+)?\s*$/, '');
  return v.replace(/^[\s.,;]+|[\s.,;]+$/g, '');
}

/**
 * Drug classes for allergy cross-matching (P1-31) — mirrors the SQL
 * public.drug_classes_for. A recorded allergy to a class name (e.g.
 * "penicillin") or to one member drug matches every member of the class,
 * so allergen "penicillin" DOES match prescribed "Amoxicillin".
 */
export const DRUG_CLASSES: Record<string, string[]> = {
  penicillins: [
    'penicillin', 'penicillin v', 'penicillin g', 'benzathine penicillin',
    'amoxicillin', 'ampicillin', 'flucloxacillin', 'cloxacillin',
    'co-amoxiclav', 'amoxiclav', 'augmentin',
  ],
  cephalosporins: [
    'cephalexin', 'cefalexin', 'cefuroxime', 'ceftriaxone', 'cefixime',
    'cefotaxime', 'cefpodoxime', 'cephalothin',
  ],
  sulfonamides: [
    'sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole', 'septrin',
    'sulfasalazine', 'sulfadiazine', 'sulfadoxine',
  ],
  nsaids: [
    'ibuprofen', 'diclofenac', 'naproxen', 'aspirin', 'acetylsalicylic acid',
    'celecoxib', 'meloxicam', 'ketorolac', 'piroxicam', 'indomethacin',
    'mefenamic acid',
  ],
};

const CLASS_TERMS: Record<string, string> = {
  penicillin: 'penicillins',
  penicillins: 'penicillins',
  cephalosporin: 'cephalosporins',
  cephalosporins: 'cephalosporins',
  sulfonamide: 'sulfonamides',
  sulfonamides: 'sulfonamides',
  sulfa: 'sulfonamides',
  sulpha: 'sulfonamides',
  nsaid: 'nsaids',
  nsaids: 'nsaids',
};

export function drugClassesFor(name: string): string[] {
  const v = normalizeDrugName(name);
  if (!v) return [];
  if (CLASS_TERMS[v]) return [CLASS_TERMS[v]];
  const classes: string[] = [];
  for (const [cls, members] of Object.entries(DRUG_CLASSES)) {
    if (members.some((m) => v === m || v.startsWith(`${m} `) || v.startsWith(`${m}/`) || v.endsWith(`/${m}`))) {
      classes.push(cls);
    }
  }
  return classes;
}

/** True when two drug names refer to the same drug/class for screening. */
function drugNamesMatch(a: string, b: string): boolean {
  const na = normalizeDrugName(a);
  const nb = normalizeDrugName(b);
  if (!na || !nb) return false;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) return true;
  const ca = drugClassesFor(na);
  const cb = drugClassesFor(nb);
  return ca.some((c) => cb.includes(c));
}

/**
 * Check `candidateDrug` against a list of `existingDrugs`. Returns interactions
 * sorted by severity (most severe first). Safe — never throws.
 */
export async function checkInteractions(
  candidateDrug: string,
  existingDrugs: string[],
): Promise<DrugInteraction[]> {
  const candidate = normalizeDrugName(candidateDrug);
  const others = Array.from(new Set(existingDrugs.map(normalizeDrugName).filter(Boolean)));
  if (!candidate || others.length === 0) return [];

  try {
    const { data, error } = await (supabase.from('drug_interactions' as any) as any)
      .select('*')
      .or(`drug_a.ilike.%${candidate}%,drug_b.ilike.%${candidate}%`);
    if (error || !data) return [];
    const rank: Record<string, number> = {
      contraindicated: 0, major: 1, severe: 1, moderate: 2, minor: 3, unknown: 4,
    };
    return (data as DrugInteraction[])
      .filter(row => {
        const matchesCandidate = drugNamesMatch(row.drug_a, candidate) || drugNamesMatch(row.drug_b, candidate);
        if (!matchesCandidate) return false;
        return others.some(o => drugNamesMatch(row.drug_a, o) || drugNamesMatch(row.drug_b, o));
      })
      .sort((x, y) => (rank[x.severity] ?? 9) - (rank[y.severity] ?? 9));
  } catch (e) {
    console.warn('drug-interaction lookup failed', e);
    return [];
  }
}

export async function getPatientActiveMedications(patientId: string): Promise<string[]> {
  if (!patientId) return [];
  const names = new Set<string>();
  try {
    const { data } = await (supabase.from('comprehensive_prescriptions' as any) as any)
      .select('medication_name, generic_name')
      .eq('patient_id', patientId)
      // NOTE: the status CHECK has no 'active' value — dispensed/usable
      // prescriptions are 'pending', 'filled' or 'partially_filled'.
      .in('status', ['pending', 'filled', 'partially_filled']);
    for (const r of (data || []) as any[]) {
      if (r.medication_name) names.add(r.medication_name);
      if (r.generic_name) names.add(r.generic_name);
    }
  } catch {
    // non-fatal — fall through to the medications table
  }
  try {
    // The patient's own current-medication list (medications table:
    // user_id / name / is_active).
    const { data } = await (supabase.from('medications' as any) as any)
      .select('name, is_active')
      .eq('user_id', patientId);
    for (const r of (data || []) as any[]) {
      if (r.is_active === false) continue;
      if (r.name) names.add(r.name);
    }
  } catch {
    // non-fatal
  }
  return [...names];
}

export function isBlocking(severity: InteractionSeverity) {
  // 'severe' is the live drug_interactions vocabulary for major interactions.
  return severity === 'contraindicated' || severity === 'major' || severity === 'severe';
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
 * Fetch the patient's recorded allergies — union of patient_allergies (the
 * structured table the allergy UI writes), the institution patient registry,
 * comprehensive medical records, and intake forms.
 * Returns a list of allergen strings (may be comma/semicolon separated in storage).
 * Safe — never throws, returns [] on failure.
 */
export async function getPatientAllergies(patientId: string): Promise<string[]> {
  if (!patientId) return [];
  const allergens = new Set<string>();
  try {
    // Source 0: patient_allergies — the structured table the AllergyAlertSystem
    // UI writes to (live column: allergen_name). This is the canonical
    // clinician/patient-recorded source; without it, allergies entered in the
    // allergy UI displayed on screen but never blocked a prescription
    // (audit 2026-10-20).
    const { data: allergyRows } = await (supabase.from('patient_allergies' as any) as any)
      .select('allergen_name, is_active')
      .eq('patient_id', patientId)
      .limit(50);
    for (const r of (allergyRows as any[]) ?? []) {
      if (r.is_active === false) continue;
      const name = (r.allergen_name || '').trim();
      if (name) allergens.add(name);
    }
  } catch {
    // non-fatal — fall through to the legacy sources
  }
  try {
    // Source 1: institution patient registry (structured allergies field)
    const { data } = await (supabase.from('institution_patient_registry' as any) as any)
      .select('allergies')
      .eq('linked_patient_id', patientId)
      .limit(1)
      .maybeSingle();
    const raw = (data as any)?.allergies as string | null;
    if (raw) {
      raw.split(/[,;|]/).map(s => s.trim()).filter(Boolean).forEach(a => allergens.add(a));
    }
  } catch {
    // non-fatal — try the next source
  }
  try {
    // Source 2: comprehensive_medical_records with allergy record types
    // (patients add these via Medical Records → Add Record). Without this,
    // the safety check misses allergies recorded outside the registry
    // (found 2026-10-09: Penicillin allergy in comprehensive_medical_records
    // did not block a Penicillin prescription).
    const { data: records } = await (supabase.from('comprehensive_medical_records' as any) as any)
      .select('title, description, record_type')
      .eq('patient_id', patientId)
      .ilike('record_type', '%allerg%')
      .limit(20);
    for (const r of (records as any[]) ?? []) {
      const text = [r.title, r.description].filter(Boolean).join(' ');
      // Extract the allergen name: prefer the title, fall back to description.
      // Titles like "Penicillin" or "Allergy: Penicillin" yield "Penicillin".
      const cleaned = text.replace(/^allergy\s*[:\-–]\s*/i, '').trim();
      if (cleaned) allergens.add(cleaned.split(/[,;|]/)[0].trim());
    }
  } catch {
    // non-fatal
  }
  try {
    // Source 3: digital intake forms (pre-visit allergy reports).
    // intake_forms.allergies is jsonb — Supabase returns it parsed, so it
    // arrives as a string, an array of strings, or occasionally an object.
    const { data: intake } = await (supabase.from('intake_forms' as any) as any)
      .select('allergies')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(3);
    for (const row of (intake as any[]) ?? []) {
      const a = (row as any)?.allergies;
      if (typeof a === 'string' && a.trim()) {
        a.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean).forEach((x: string) => allergens.add(x));
      } else if (Array.isArray(a)) {
        a.map((s: any) => String(s).trim()).filter(Boolean).forEach((x: string) => allergens.add(x));
      }
    }
  } catch {
    // non-fatal
  }
  return [...allergens].filter(Boolean);
}

/**
 * Check prescribed medication names against the patient's known allergies.
 * Matches on substring containment (either way, both sides >= 3 chars after
 * dosage-stripping normalisation) OR on shared drug class — so allergen
 * "penicillin" matches "Amoxicillin" (same penicillins class) — plus the
 * penicillin <-> cephalosporin cross-reactivity pair. Mirrors the SQL
 * public.screen_medications used by the server-side safety gate.
 * Safe — never throws.
 */
export function checkAllergyMatches(
  medicationNames: string[],
  allergies: string[],
): AllergyMatch[] {
  const meds = medicationNames.map(normalizeDrugName).filter(Boolean);
  const allergens = allergies.map(normalizeDrugName).filter(Boolean);
  if (!meds.length || !allergens.length) return [];
  const matches: AllergyMatch[] = [];
  for (let mi = 0; mi < meds.length; mi++) {
    const med = meds[mi];
    const medClasses = drugClassesFor(med);
    for (let ai = 0; ai < allergens.length; ai++) {
      const allergen = allergens[ai];
      const allergenClasses = drugClassesFor(allergen);
      const substringMatch =
        allergen.length >= 3 && med.length >= 3 &&
        (med.includes(allergen) || allergen.includes(med));
      const sameClass = medClasses.some((c) => allergenClasses.includes(c));
      const crossReactive =
        (allergenClasses.includes('penicillins') && medClasses.includes('cephalosporins')) ||
        (allergenClasses.includes('cephalosporins') && medClasses.includes('penicillins'));
      if (substringMatch || sameClass || crossReactive) {
        matches.push({ medication: medicationNames[mi], allergen: allergies[ai] });
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
