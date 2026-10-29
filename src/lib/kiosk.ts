import { supabase } from "@/integrations/supabase/client";

/**
 * Patient Self-Service Kiosk data path (2026-10-29).
 *
 * The kiosk runs under the institution's staff session (staff launch it
 * from the institution dashboard) and talks to the ONE patient master
 * through three narrow server functions:
 *
 * - `kiosk_terminal_info` — institution name + whether this session may
 *   operate the terminal. No patient data.
 * - `kiosk_lookup_patient` — finds a patient of THIS hospital by the exact
 *   phone number the patient types. Exact match only (no substring
 *   search, so the roster can never be enumerated from the kiosk screen),
 *   minimal fields back (name + visit flags — never email or DOB), and
 *   every lookup is audited server-side.
 * - `kiosk_check_in` — puts a verified patient into today's queue and
 *   returns the real queue token (the T-NNN series the queue desk uses).
 *   Idempotent: a patient already in today's queue gets the same token.
 *
 * Walk-in registration reuses `findOrCreatePatient` (src/lib/patients.ts)
 * so a patient registered at the kiosk is the same master record the
 * front desk, queue, lab and every other module see.
 */

export interface KioskTerminalInfo {
  institutionName: string;
  canOperate: boolean;
}

export interface KioskPatientMatch {
  patientId: string;
  firstName: string;
  lastName: string;
  name: string;
  hasAppointmentToday: boolean;
  activeTokenNumber: string | null;
}

export interface KioskCheckInResult {
  tokenId: string;
  tokenNumber: string;
  patientName: string;
  department: string;
  alreadyCheckedIn: boolean;
}

/** Digits only — the server matches on the same normalisation. */
export function normalizePhoneDigits(phone: string): string {
  return (phone || "").replace(/[^0-9]/g, "");
}

/**
 * A kiosk lookup needs a full phone number. The server refuses anything
 * shorter than 9 digits so partial numbers can never be used to fish
 * for patients.
 */
export function isCompletePhone(phone: string): boolean {
  return normalizePhoneDigits(phone).length >= 9;
}

export async function getKioskTerminalInfo(
  institutionId: string,
): Promise<KioskTerminalInfo> {
  const { data, error } = await (supabase.rpc as any)("kiosk_terminal_info", {
    p_institution_id: institutionId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Kiosk terminal service did not respond");
  return {
    institutionName: row.institution_name as string,
    canOperate: Boolean(row.can_operate),
  };
}

export async function lookupKioskPatient(
  institutionId: string,
  phone: string,
): Promise<KioskPatientMatch[]> {
  const { data, error } = await (supabase.rpc as any)("kiosk_lookup_patient", {
    p_institution_id: institutionId,
    p_phone: phone,
  });
  if (error) throw error;
  return (data || []).map((r: any) => {
    const firstName = r.first_name || "";
    const lastName = r.last_name || "";
    return {
      patientId: r.patient_id as string,
      firstName,
      lastName,
      name: [firstName, lastName].filter(Boolean).join(" ") || "Patient",
      hasAppointmentToday: Boolean(r.has_appointment_today),
      activeTokenNumber: (r.active_token_number as string | null) ?? null,
    } as KioskPatientMatch;
  });
}

export async function kioskCheckIn(
  institutionId: string,
  patientId: string,
  department: string,
  notes?: string | null,
): Promise<KioskCheckInResult> {
  const { data, error } = await (supabase.rpc as any)("kiosk_check_in", {
    p_institution_id: institutionId,
    p_patient_id: patientId,
    p_department: department,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token_number) {
    throw new Error("Check-in service did not return a queue token");
  }
  return {
    tokenId: row.token_id as string,
    tokenNumber: row.token_number as string,
    patientName: row.patient_name as string,
    department: row.department as string,
    alreadyCheckedIn: Boolean(row.already_checked_in),
  };
}
