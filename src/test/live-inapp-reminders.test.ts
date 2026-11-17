/**
 * LIVE proof for in-app appointment reminders — runs ONLY with LIVE_PROOF=1.
 *
 * Exercises the REAL booking-time flow against the live Doc'O Clock project
 * (tthzcijscedgxjfnfnky) with QA users only:
 *   1. QA patient-1 books an appointment ~65 min out (real appointments
 *      insert, as the patient, through the same payload BookingModal sends).
 *   2. send-appointment-reminder (deployed edge fn) writes the booking-time
 *      confirmation notification + the system note in the chat thread.
 *   3. queueInAppAppointmentReminders() writes the scheduled reminder row
 *      (due ~5 min after booking: 1h lead on a 65-min-out appointment).
 *   4. queueAppointmentReminders() writes the WhatsApp/SMS message_queue
 *      rows (untouched path — proves the fallback still queues).
 *   5. Re-running steps 2–3 proves dedupe: still exactly one of each.
 *   6. QA patient-2 reads nothing of patient-1's reminder (RLS).
 *   7. After the due time passes, the scheduled reminder becomes visible
 *      through the exact query use-notifications runs.
 *
 * Run with TZ=Africa/Lusaka (appointment wall time is CAT) and:
 *   LIVE_PROOF=1 REMIND_QA_PASSWORD=... PATIENT1_ID=... PATIENT2_ID=...
 *   PROVIDER_ID=... VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=...
 *   npx vitest run src/test/live-inapp-reminders.test.ts
 * Never committed with credentials: everything secret comes from env.
 */
import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { queueInAppAppointmentReminders } from "@/lib/appointmentReminders";
import { queueAppointmentReminders } from "@/utils/sms-reminder-service";
import { SYSTEM_REMINDER_MARKER } from "@/lib/chatSystemNote";

const LIVE = process.env.LIVE_PROOF === "1";

const PATIENT1_EMAIL = "remind-qa-patient-1@doc0clock.online";
const PATIENT2_EMAIL = "remind-qa-patient-2@doc0clock.online";
const PASSWORD = process.env.REMIND_QA_PASSWORD as string;
const PATIENT1_ID = process.env.PATIENT1_ID as string;
const PATIENT2_ID = process.env.PATIENT2_ID as string;
const PROVIDER_ID = process.env.PROVIDER_ID as string;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe.skipIf(!LIVE)("live in-app appointment reminders", () => {
  it(
    "books, confirms in-app, queues WhatsApp untouched, dedupes, isolates, and surfaces at due time",
    { timeout: 600_000 },
    async () => {
      expect(PASSWORD, "REMIND_QA_PASSWORD env required").toBeTruthy();
      expect(PATIENT1_ID).toBeTruthy();
      expect(PATIENT2_ID).toBeTruthy();
      expect(PROVIDER_ID).toBeTruthy();

      // --- Sign in as QA patient-1 -------------------------------------
      const signIn = await supabase.auth.signInWithPassword({
        email: PATIENT1_EMAIL,
        password: PASSWORD,
      });
      expect(signIn.error, `patient-1 sign-in: ${signIn.error?.message}`).toBeNull();
      expect(signIn.data.user?.id).toBe(PATIENT1_ID);

      // Free the slot: cancel any of this patient's still-open appointments
      // with this provider left by earlier proof runs (the availability
      // trigger blocks double-booking the same slot).
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("patient_id", PATIENT1_ID)
        .eq("provider_id", PROVIDER_ID)
        .in("status", ["pending", "scheduled", "confirmed"]);

      // --- Book ~65 min out (CAT wall time) ----------------------------
      const now = new Date();
      const apptAt = new Date(now.getTime() + 65 * 60_000);
      const dateStr = `${apptAt.getFullYear()}-${pad(apptAt.getMonth() + 1)}-${pad(apptAt.getDate())}`;
      const timeStr = `${pad(apptAt.getHours())}:${pad(apptAt.getMinutes())}`;

      const { data: booked, error: bookErr } = await supabase
        .from("appointments")
        .insert({
          patient_id: PATIENT1_ID,
          provider_id: PROVIDER_ID,
          date: dateStr,
          time: timeStr,
          appointment_date: dateStr,
          appointment_time: timeStr,
          appointment_type: "video_consultation",
          type: "video_consultation",
          status: "pending",
          duration: 30,
          patient_visit_type: "new",
        })
        .select("id, date, time, status, created_at")
        .single();
      expect(bookErr, `booking: ${bookErr?.message}`).toBeNull();
      const appointmentId = (booked as { id: string }).id;
      expect(appointmentId).toBeTruthy();
      expect((booked as { status: string }).status).toBe("pending");

      // --- Booking-time confirmation + chat note (edge fn) --------------
      const invoked = await supabase.functions.invoke("send-appointment-reminder", {
        body: { appointment_id: appointmentId },
      });
      expect(invoked.error, `edge fn: ${invoked.error?.message}`).toBeFalsy();
      expect((invoked.data as { success: boolean }).success).toBe(true);
      expect((invoked.data as { chat_note_id: string | null }).chat_note_id).toBeTruthy();

      // --- Scheduled in-app reminder + WhatsApp queue (real helpers) ----
      const inAppCreated = await queueInAppAppointmentReminders({
        appointmentId,
      });
      expect(inAppCreated).toBe(1); // 24h lead in the past (skipped); 1h lead due ~5 min out
      const waQueued = await queueAppointmentReminders({
        patientId: PATIENT1_ID,
        patientPhone: "+260977000101",
        patientName: "Remmy One",
        appointmentId,
        appointmentDate: new Date(`${dateStr}T${timeStr}`),
        doctorName: "Dr. Jane One",
      });
      expect(waQueued).toBe(2); // whatsapp + sms: this QA patient's prefs
      // default all channels on (sms_enabled=true live). One row per
      // channel, same due instant — the untouched queue behaviour.

      const visibleNow = async () =>
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", PATIENT1_ID)
          .lte("visible_at", new Date().toISOString())
          .order("created_at", { ascending: false });

      // --- Confirmation visible immediately; scheduled hidden until due --
      const visible = await visibleNow();
      expect(visible.error).toBeNull();
      const confirmations = (visible.data as unknown[]).filter(
        (n) =>
          (n as { appointment_id: string; kind: string }).appointment_id === appointmentId &&
          (n as { kind: string }).kind === "confirmation",
      );
      expect(confirmations).toHaveLength(1);
      expect((confirmations[0] as { read: boolean }).read).toBe(false);
      expect((confirmations[0] as { type: string }).type).toBe("appointment");
      const remindersVisible = (visible.data as unknown[]).filter(
        (n) =>
          (n as { appointment_id: string; kind: string }).appointment_id === appointmentId &&
          (n as { kind: string }).kind === "reminder",
      );
      expect(remindersVisible).toHaveLength(0); // not due yet

      // Reminder row exists in the table (hidden by visible_at), due ~5 min out.
      const allNotifs = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", PATIENT1_ID)
        .eq("appointment_id", appointmentId);
      expect(allNotifs.error).toBeNull();
      const reminders = (allNotifs.data as unknown[]).filter(
        (n) => (n as { kind: string }).kind === "reminder",
      );
      expect(reminders).toHaveLength(1);
      const dueAt = new Date((reminders[0] as { visible_at: string }).visible_at).getTime();
      expect(dueAt).toBeGreaterThan(now.getTime());
      expect(dueAt - now.getTime()).toBeLessThan(10 * 60_000);

      // --- WhatsApp queue rows untouched ---------------------------------
      const queue = await supabase
        .from("message_queue")
        .select("*")
        .eq("appointment_id", appointmentId);
      expect(queue.error).toBeNull();
      expect(queue.data).toHaveLength(2); // one per channel: whatsapp + sms
      const waRow = (queue.data as unknown[]).find(
        (r) => (r as { channel: string }).channel === "whatsapp",
      ) as { template_key: string; channel: string; status: string; scheduled_for: string };
      expect(waRow).toMatchObject({
        template_key: "appointment_reminder",
        channel: "whatsapp",
        status: "queued",
      });
      const waDue = new Date(waRow.scheduled_for).getTime();
      // Same due instant as the in-app reminder (same lead-hour function).
      expect(Math.abs(waDue - dueAt)).toBeLessThan(60_000);

      // --- System note in the chat thread -------------------------------
      const thread = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", PROVIDER_ID)
        .eq("receiver_id", PATIENT1_ID)
        .order("created_at", { ascending: false });
      expect(thread.error).toBeNull();
      const notes = (thread.data as unknown[]).filter(
        (m) =>
          ((m as { content: string }).content || "").startsWith(SYSTEM_REMINDER_MARKER) &&
          // Scoped to THIS appointment's slot: earlier proof runs left
          // their own (correct, deduped) notes in the same thread.
          ((m as { content: string }).content || "").includes(timeStr),
      );
      expect(notes).toHaveLength(1);
      expect((notes[0] as { content: string }).content).toContain("Dr. Jane One");
      expect((notes[0] as { content: string }).content).toContain(timeStr);

      // --- Dedupe: re-running both writers creates nothing twice -------
      const invoked2 = await supabase.functions.invoke("send-appointment-reminder", {
        body: { appointment_id: appointmentId },
      });
      expect(invoked2.error).toBeFalsy();
      expect((invoked2.data as { chat_note_created: boolean }).chat_note_created).toBe(false);
      const inAppAgain = await queueInAppAppointmentReminders({ appointmentId });
      expect(inAppAgain).toBe(0);
      const afterDupes = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", PATIENT1_ID)
        .eq("appointment_id", appointmentId);
      expect(afterDupes.data).toHaveLength(2); // 1 confirmation + 1 reminder
      const thread2 = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", PROVIDER_ID)
        .eq("receiver_id", PATIENT1_ID);
      const notes2 = (thread2.data as unknown[]).filter(
        (m) =>
          ((m as { content: string }).content || "").startsWith(SYSTEM_REMINDER_MARKER) &&
          ((m as { content: string }).content || "").includes(timeStr),
      );
      expect(notes2).toHaveLength(1);

      // --- Cross-patient isolation ---------------------------------------
      await supabase.auth.signOut();
      const signIn2 = await supabase.auth.signInWithPassword({
        email: PATIENT2_EMAIL,
        password: PASSWORD,
      });
      expect(signIn2.error).toBeNull();
      expect(signIn2.data.user?.id).toBe(PATIENT2_ID);
      const otherNotifs = await supabase
        .from("notifications")
        .select("*")
        .eq("appointment_id", appointmentId);
      expect(otherNotifs.error).toBeNull();
      expect(otherNotifs.data).toHaveLength(0);
      const otherMsgs = await supabase
        .from("messages")
        .select("*")
        .eq("receiver_id", PATIENT1_ID);
      expect(otherMsgs.error).toBeNull();
      expect(otherMsgs.data).toHaveLength(0);
      const otherQueue = await supabase
        .from("message_queue")
        .select("*")
        .eq("appointment_id", appointmentId);
      expect(otherQueue.error).toBeNull();
      expect(otherQueue.data).toHaveLength(0);

      // --- Due time: the scheduled reminder becomes visible ------------
      await supabase.auth.signOut();
      const signIn1b = await supabase.auth.signInWithPassword({
        email: PATIENT1_EMAIL,
        password: PASSWORD,
      });
      expect(signIn1b.error).toBeNull();
      let surfaced = false;
      const deadline = Date.now() + 8 * 60_000;
      while (Date.now() < deadline) {
        const check = await visibleNow();
        const found = ((check.data as unknown[]) || []).some(
          (n) =>
            (n as { appointment_id: string; kind: string }).appointment_id === appointmentId &&
            (n as { kind: string }).kind === "reminder",
        );
        if (found) {
          surfaced = true;
          break;
        }
        await sleep(15_000);
      }
      expect(surfaced).toBe(true);

      // Record the appointment id for the purge step (also printed by the
      // runner). The row is left for the proof record, then purged.
      // eslint-disable-next-line no-console
      console.log(`LIVE_PROOF_APPOINTMENT_ID=${appointmentId}`);
      await supabase.auth.signOut();
    },
  );
});
