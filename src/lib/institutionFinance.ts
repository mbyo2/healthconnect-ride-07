import { supabase } from "@/integrations/supabase/client";

/**
 * LP-1: institution settlement / compliance fields (bank details, tax id,
 * registration and license numbers) live in `healthcare_institution_finance`
 * behind admin-scoped RLS — NOT on `healthcare_institutions`, whose finance
 * columns are always NULL now and unreadable to anon. The table is not in
 * the generated types, so access goes through `(supabase as any)`.
 */
export interface InstitutionFinance {
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  swift_code?: string | null;
  tax_id?: string | null;
  business_registration_number?: string | null;
  license_number?: string | null;
}

export const INSTITUTION_FINANCE_FIELDS = [
  "bank_name",
  "bank_account_number",
  "bank_account_name",
  "swift_code",
  "tax_id",
  "business_registration_number",
  "license_number",
] as const;

/** Split a form/payload object into the base-table part and the finance part. */
export function splitInstitutionFinance<T extends Record<string, any>>(
  payload: T,
): { base: Record<string, any>; finance: InstitutionFinance } {
  const base: Record<string, any> = { ...payload };
  const finance: InstitutionFinance = {};
  for (const field of INSTITUTION_FINANCE_FIELDS) {
    if (field in base) {
      (finance as any)[field] = base[field] ?? null;
      delete base[field];
    }
  }
  return { base, finance };
}

/** Load the finance row for one institution (null when none saved yet). */
export async function loadInstitutionFinance(
  institutionId: string,
): Promise<InstitutionFinance | null> {
  const { data } = await (supabase as any)
    .from("healthcare_institution_finance")
    .select(
      "bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number",
    )
    .eq("institution_id", institutionId)
    .maybeSingle();
  return (data as InstitutionFinance) ?? null;
}

/** Load finance rows for many institutions, keyed by institution_id. */
export async function loadInstitutionFinanceMap(
  institutionIds: string[],
): Promise<Map<string, InstitutionFinance>> {
  const map = new Map<string, InstitutionFinance>();
  const ids = Array.from(new Set(institutionIds.filter(Boolean)));
  if (ids.length === 0) return map;
  const { data } = await (supabase as any)
    .from("healthcare_institution_finance")
    .select(
      "institution_id, bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number",
    )
    .in("institution_id", ids);
  for (const row of (data as any[]) || []) {
    if (row?.institution_id) map.set(row.institution_id, row);
  }
  return map;
}

/** Save (upsert) the finance fields for an institution. */
export async function upsertInstitutionFinance(
  institutionId: string,
  finance: InstitutionFinance,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("healthcare_institution_finance")
    .upsert(
      { institution_id: institutionId, ...finance, updated_at: new Date().toISOString() },
      { onConflict: "institution_id" },
    );
  if (error) throw error;
}
