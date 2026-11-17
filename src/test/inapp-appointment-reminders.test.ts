import { describe, it, expect } from "vitest";
import {
  buildReminderNotificationRows,
  getInAppReminderTimes,
} from "@/lib/appointmentReminders";
import {
  SYSTEM_REMINDER_MARKER,
  buildReminderNoteText,
  formatProviderDisplayName,
  isSystemReminderNote,
} from "@/lib/chatSystemNote";
import { resolveReminderLeadHours } from "@/utils/sms-reminder-service";

describe("resolveReminderLeadHours (shared WhatsApp + in-app schedule)", () => {
  it("defaults to 24h when the patient set nothing", () => {
    expect(resolveReminderLeadHours({})).toEqual([24]);
    expect(resolveReminderLeadHours({ appointment_reminder_hours: null })).toEqual([24]);
  });

  it("uses the patient's chosen lead time and second reminder", () => {
    expect(
      resolveReminderLeadHours({
        appointment_reminder_hours: 48,
        second_reminder_hours: 2,
      }),
    ).toEqual([48, 2]);
  });
});

describe("getInAppReminderTimes", () => {
  const appt = new Date("2026-11-20T10:30:00.000Z");
  const now = new Date("2026-11-19T09:00:00.000Z");

  it("mirrors the WhatsApp lead times (24h default)", () => {
    const slots = getInAppReminderTimes({}, appt, now);
    expect(slots).toHaveLength(1);
    expect(slots[0].leadHours).toBe(24);
    expect(slots[0].when.toISOString()).toBe("2026-11-19T10:30:00.000Z");
  });

  it("includes the second reminder and sorts earliest first", () => {
    const slots = getInAppReminderTimes(
      { appointment_reminder_hours: 24, second_reminder_hours: 2 },
      appt,
      now,
    );
    expect(slots.map((s) => s.leadHours)).toEqual([24, 2]);
    expect(slots[0].when.getTime()).toBeLessThan(slots[1].when.getTime());
  });

  it("drops lead times already in the past (same rule as the WhatsApp queue)", () => {
    const slots = getInAppReminderTimes(
      { appointment_reminder_hours: 48, second_reminder_hours: 2 },
      appt,
      now,
    );
    // 48h lead would have been 2026-11-18T10:30 — before `now`.
    expect(slots.map((s) => s.leadHours)).toEqual([2]);
  });
});

describe("buildReminderNotificationRows", () => {
  it("builds one deduped row per slot with the real appointment facts", () => {
    const rows = buildReminderNotificationRows({
      patientId: "11111111-1111-1111-1111-111111111111",
      appointmentId: "22222222-2222-2222-2222-222222222222",
      patientName: "Remmy Banda",
      providerName: "Dr. Jane Banda",
      facilityName: "Lusaka General Hospital",
      appointmentDate: new Date("2026-11-20T10:30:00.000Z"),
      slots: [
        { leadHours: 24, when: new Date("2026-11-19T10:30:00.000Z") },
        { leadHours: 2, when: new Date("2026-11-20T08:30:00.000Z") },
      ],
    });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.user_id).toBe("11111111-1111-1111-1111-111111111111");
      expect(row.appointment_id).toBe("22222222-2222-2222-2222-222222222222");
      expect(row.kind).toBe("reminder");
      expect(row.type).toBe("appointment");
      expect(row.read).toBe(false);
      expect(row.message).toContain("Dr. Jane Banda");
      expect(row.message).toContain("Lusaka General Hospital");
      expect(row.message).toContain("20/11/2026");
      expect(row.message).toContain("10:30");
    }
    // Dedupe key (appointment_id, kind, visible_at) is unique per row.
    const keys = rows.map((r) => `${r.appointment_id}|${r.kind}|${r.visible_at}`);
    expect(new Set(keys).size).toBe(rows.length);
    expect(rows[0].visible_at).toBe("2026-11-19T10:30:00.000Z");
    expect(rows[1].visible_at).toBe("2026-11-20T08:30:00.000Z");
  });
});

describe("chat system-note convention", () => {
  it("builds a labelled note from the appointment facts", () => {
    const text = buildReminderNoteText({
      patientFirstName: "Remmy",
      providerFirstName: "Jane",
      providerLastName: "Banda",
      providerRole: "doctor",
      facilityName: "Lusaka General Hospital",
      dateLabel: "Fri 20 Nov 2026",
      timeLabel: "10:30",
    });
    expect(text.startsWith(SYSTEM_REMINDER_MARKER)).toBe(true);
    expect(text).toContain("Hi Remmy,");
    expect(text).toContain("Dr. Jane Banda");
    expect(text).toContain("Lusaka General Hospital");
    expect(text).toContain("Fri 20 Nov 2026");
    expect(text).toContain("10:30");
  });

  it("detects system notes and ignores ordinary chat", () => {
    expect(isSystemReminderNote("[Doc'O Clock reminder] hi")).toBe(true);
    expect(isSystemReminderNote("Hello doctor, I feel sick")).toBe(false);
    expect(isSystemReminderNote(null)).toBe(false);
    expect(isSystemReminderNote("")).toBe(false);
  });

  it("formats provider names with the Dr. prefix only for clinical roles", () => {
    expect(formatProviderDisplayName("Jane", "Banda", "doctor")).toBe("Dr. Jane Banda");
    expect(formatProviderDisplayName("Jane", "Banda", "nurse")).toBe("Jane Banda");
    expect(formatProviderDisplayName(null, null, "doctor")).toBe("Your provider");
  });
});
