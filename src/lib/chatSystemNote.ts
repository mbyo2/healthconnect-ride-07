/**
 * System reminder notes in patient<->provider chat threads.
 *
 * CONVENTION (shared with group 1 — chat owners of src/components/chat/*):
 *
 * - A system reminder note is PLATFORM-written, never typed by a user.
 *   It is inserted by the `send-appointment-reminder` edge function under
 *   the service role (the browser client cannot write it: the messages
 *   INSERT policy requires auth.uid() = sender_id, and messages.sender_id
 *   has a foreign key to profiles(id), so no nil-UUID "system" sender can
 *   be inserted without inventing a profile row).
 * - Until group 1 adds a dedicated system-sender rendering, the note is
 *   delivered in the PROVIDER's slot (sender_id = provider, receiver_id =
 *   patient) so the existing 1:1 ChatWindow query — which only fetches
 *   rows where sender/receiver are the two parties — renders it today,
 *   left-aligned like an incoming message. The content itself is explicit
 *   that it is a Doc'O Clock reminder, not a message the provider typed.
 * - Every note starts with SYSTEM_REMINDER_MARKER, so group 1 can
 *   re-attribute it later (centered system bubble) by matching
 *   isSystemReminderNote(content), and so the writer can dedupe by exact
 *   content. To render system notes with a dedicated sender instead,
 *   group 1 needs, in ChatWindow: add
 *   `.or('sender_id.eq.<SYSTEM_SENDER_UUID>,...')` to the fetch query and
 *   the same sender in the realtime filter, plus a profiles row for that
 *   sender — that change is theirs, not guessed here.
 *
 * This module owns the marker, the text builder, and the detector. The
 * edge function carries a copy of the builder (Deno functions cannot
 * import from src/) — keep the two in sync.
 */

export const SYSTEM_REMINDER_MARKER = "[Doc'O Clock reminder]";

/** Roles that take the "Dr." prefix in reminder text (mirrors the edge fn). */
const DOCTORAL_ROLES = new Set([
  "doctor",
  "specialist",
  "dentist",
  "medical_licentiate",
  "radiologist",
  "pathologist",
  "health_personnel",
]);

export function formatProviderDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  role?: string | null,
): string {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  if (!name) return "Your provider";
  const prefix =
    role && DOCTORAL_ROLES.has(String(role).toLowerCase()) ? "Dr. " : "";
  return `${prefix}${name}`;
}

export interface ReminderNoteFacts {
  patientFirstName?: string | null;
  providerFirstName?: string | null;
  providerLastName?: string | null;
  providerRole?: string | null;
  facilityName?: string | null;
  /** e.g. "Tue 18 Nov 2026" — already formatted from the appointment row. */
  dateLabel: string;
  /** e.g. "10:30" — already formatted from the appointment row. */
  timeLabel: string;
}

/**
 * Build the note text from the appointment's own records. All facts come
 * from the platform (appointment + profiles rows) — nothing is re-entered
 * or invented by the caller.
 */
export function buildReminderNoteText(facts: ReminderNoteFacts): string {
  const provider = formatProviderDisplayName(
    facts.providerFirstName,
    facts.providerLastName,
    facts.providerRole,
  );
  const facility = facts.facilityName || "your facility";
  const greeting = facts.patientFirstName
    ? `Hi ${facts.patientFirstName}, `
    : "";
  return (
    `${SYSTEM_REMINDER_MARKER} ${greeting}you have an appointment with ` +
    `${provider} at ${facility} on ${facts.dateLabel} at ${facts.timeLabel}. ` +
    `Please arrive 15 minutes early.`
  );
}

/** True when a message row is a platform-written reminder note. */
export function isSystemReminderNote(
  content: string | null | undefined,
): boolean {
  return !!content && content.startsWith(SYSTEM_REMINDER_MARKER);
}
