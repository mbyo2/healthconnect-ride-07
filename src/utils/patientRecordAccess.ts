/**
 * Display gate for the provider "My Patients" records tab
 * (src/components/provider/PatientRecords.tsx).
 *
 * The security boundary is RLS on comprehensive_medical_records: the base
 * query only ever returns rows the caller may see (records they created,
 * records of patients they have a recent confirmed appointment with,
 * break-glass-unlocked records, their own as patient, admin). This gate
 * only narrows that RLS-visible set to patients the provider has a
 * current, explainable link to — it can never widen it:
 *
 *  - hasRelationship: the has_patient_relationship RPC (appointment,
 *    prescription, lab order, referral, or facility-queue relationship) —
 *    the same relationship primitive the RLS policies lean on.
 *  - hasActiveGrant: an unexpired, unrevoked break-the-glass grant the
 *    clinician holds for this patient (emergency access must surface the
 *    records it unlocked, appointment or not).
 *  - hasOwnRecord: the provider authored at least one of the visible
 *    records for this patient (RLS "Providers can view records they
 *    created" has no expiry — authorship must not vanish from the tab
 *    just because the appointment aged past the RLS relationship window).
 *
 * History: PatientRecords previously filtered through
 * checkProviderAccess (src/utils/provider-patient-access.ts) and read a
 * non-existent `.allowed` property off its result ({ hasAccess, ... }),
 * so every patient was filtered out and the tab showed "No patient
 * records yet" for EVERY provider — including a doctor looking at the
 * record of his own consultation. Behind that, the util's institution
 * layer demands an active patient_institution_links row, a table with
 * zero rows platform-wide, so even the corrected property would have
 * kept the tab permanently empty. The util remains untouched for its
 * other (history-fetch) contract; this gate mirrors the access model
 * the RLS policies actually enforce.
 */
export interface PatientRecordAccessSignals {
  hasRelationship: boolean;
  hasActiveGrant: boolean;
  hasOwnRecord: boolean;
}

export function isPatientRecordAccessible(signals: PatientRecordAccessSignals): boolean {
  return signals.hasRelationship || signals.hasActiveGrant || signals.hasOwnRecord;
}
