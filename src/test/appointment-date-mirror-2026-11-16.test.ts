import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Appointment date/time mirror columns (doc swarm 2026-11-16, group 1).
 *
 * The appointments table carries two spellings of the slot: date/time and
 * appointment_date/appointment_time (+ appointment_type). The server
 * triggers COALESCE them, but BookingModal and the Appointments-page
 * reschedule only ever wrote date/time — so every app booking left
 * appointment_date NULL live (proven: all 4 swarm bookings + the
 * pre-existing app bookings). Readers of the mirror columns then never
 * saw the booking: kiosk_lookup_patient's has_appointment_today is
 * always false for app bookings, and the patient overview hero / review
 * prompts query appointment_date. Both writers must keep the mirror in
 * sync at the source.
 */
const bookingModal = readFileSync(
  resolve(__dirname, "../components/booking/BookingModal.tsx"),
  "utf8",
);
const appointmentsPage = readFileSync(
  resolve(__dirname, "../pages/Appointments.tsx"),
  "utf8",
);

describe("booking writes the appointment_date/time mirror columns", () => {
  it("BookingModal payload sets appointment_date, appointment_time and appointment_type", () => {
    expect(bookingModal).toContain("appointment_date:");
    expect(bookingModal).toContain("appointment_time:");
    expect(bookingModal).toContain("appointment_type:");
    // The mirror must carry the same slot as date/time, not a literal.
    expect(bookingModal).toMatch(
      /appointment_date:\s*format\(selectedDate,\s*['"]yyyy-MM-dd['"]\)/,
    );
    expect(bookingModal).toMatch(/appointment_time:\s*selectedTime/);
  });

  it("reschedule updates the mirror columns together with date/time", () => {
    expect(appointmentsPage).toMatch(
      /\.update\(\{\s*date: newDate,\s*time: newTime,\s*appointment_date: newDate,\s*appointment_time: newTime\s*\}\)/,
    );
  });
});
