import { buildCsv } from "@/utils/csvExport";

/**
 * CSV builders for the admin audit-trail viewers (Security Audit Logs and
 * Patient Access Log).
 *
 * Both viewers load the most recent AUDIT_TRAIL_FETCH_LIMIT rows and filter
 * client-side; an export contains exactly the rows the admin has filtered
 * to on screen — no second query, no wider data path. The viewers show an
 * honest note when the fetch cap is hit so nobody mistakes the export for
 * the complete all-time trail.
 */
export const AUDIT_TRAIL_FETCH_LIMIT = 500;

export const SECURITY_AUDIT_EXPORT_COLUMNS = [
  "Timestamp",
  "Actor",
  "Action",
  "Category",
  "Target / Resource",
  "Details",
  "IP Address",
  "Device / User Agent",
] as const;

export interface SecurityAuditLogExportInput {
  created_at: string;
  user_email?: string | null;
  event_type: string;
  event_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

const TARGET_KEYS = [
  "target_user_id",
  "target_id",
  "institution_id",
  "patient_id",
  "record_id",
  "resource_id",
  "entity_id",
  "user_id",
] as const;

/**
 * Best-effort "what was acted on" for a security_audit_log row: the first
 * recognised identifier inside event_data, else the role transition the
 * viewer already renders, else blank (the full payload still travels in
 * the Details column).
 */
export function securityAuditTarget(
  eventData: Record<string, unknown> | null | undefined,
): string {
  if (!eventData) return "";
  for (const key of TARGET_KEYS) {
    const value = eventData[key];
    if (typeof value === "string" && value) return `${key}: ${value}`;
  }
  if (typeof eventData.role === "string" && eventData.role) {
    return `role: ${eventData.role}`;
  }
  if (eventData.old_role || eventData.new_role) {
    return `role: ${String(eventData.old_role ?? "?")} → ${String(eventData.new_role ?? "?")}`;
  }
  return "";
}

export function buildSecurityAuditCsv(
  logs: SecurityAuditLogExportInput[],
  categoryOf: (eventType: string) => string,
): string {
  const rows = logs.map((log) => [
    log.created_at,
    log.user_email ?? "",
    log.event_type,
    categoryOf(log.event_type),
    securityAuditTarget(log.event_data),
    log.event_data ? JSON.stringify(log.event_data) : "",
    log.ip_address ?? "",
    log.user_agent ?? "",
  ]);
  return buildCsv([...SECURITY_AUDIT_EXPORT_COLUMNS], rows);
}

export const PATIENT_ACCESS_EXPORT_COLUMNS = [
  "Timestamp",
  "Accessed By",
  "Patient",
  "Access Type",
  "Surface / Search",
  "Detail",
] as const;

export interface PatientAccessExportInput {
  accessed_at: string;
  accessor_id: string;
  accessor_label?: string | null;
  patient_id: string;
  patient_label?: string | null;
  access_type: string;
  search_term?: string | null;
  reason?: string | null;
}

export function buildPatientAccessCsv(rows: PatientAccessExportInput[]): string {
  const data = rows.map((row) => [
    row.accessed_at,
    row.accessor_label || row.accessor_id,
    row.patient_label || row.patient_id,
    row.access_type,
    row.search_term ?? "",
    row.reason ?? "",
  ]);
  return buildCsv([...PATIENT_ACCESS_EXPORT_COLUMNS], data);
}
