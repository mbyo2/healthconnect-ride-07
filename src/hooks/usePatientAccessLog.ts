import { useEffect, useRef } from "react";
import {
  logPatientRecordAccess,
  type PatientRecordSurface,
} from "@/utils/patientAccessLog";

/**
 * Log one patient-record view when a record surface opens for a patient.
 *
 * Fires once per component mount per (patient, surface): the ref guard
 * survives React StrictMode's setup→cleanup→setup double-invoke, so a
 * single open never double-logs. When `patientId` changes to a different
 * patient (e.g. a clinician selecting another patient in a records
 * table), that is a new open and logs again. All failures are swallowed
 * inside logPatientRecordAccess — this hook never throws and never
 * blocks rendering.
 */
export function usePatientAccessLog(
  patientId: string | null | undefined,
  surface: PatientRecordSurface,
  context?: Record<string, unknown>,
): void {
  const loggedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    if (loggedForRef.current === patientId) return;
    loggedForRef.current = patientId;
    logPatientRecordAccess(patientId, surface, context);
    // context is intentionally not a dependency: it is descriptive
    // metadata captured at open time, not a trigger for a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, surface]);
}
