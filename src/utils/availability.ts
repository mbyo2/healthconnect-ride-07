import { format, addDays, isSameDay, startOfDay } from "date-fns";

/** Fallback pool when the provider publishes no schedule at all. */
export const DEFAULT_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

export const SLOT_MINUTES = 30;
const MAX_SLOTS_PER_DAY = 16;

export type DaySchedule = { available: boolean; hours?: string[] };

export const toMinutes = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

const toHHMM = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/**
 * Provider schedules store working *ranges* ("09:00-12:00"), not discrete
 * bookable times. Expand each entry into 30-minute slots so availability
 * UIs show real bookable times. Bare "HH:MM" entries are kept as-is;
 * malformed entries are ignored rather than rendered.
 */
export function expandHoursToSlots(hours: string[]): string[] {
  const out: string[] = [];
  for (const raw of hours) {
    const entry = String(raw).trim();
    if (!entry) continue;
    if (entry.includes("-")) {
      const [startRaw, endRaw] = entry.split("-", 2);
      const start = toMinutes(startRaw);
      const end = toMinutes(endRaw);
      if (start === null || end === null || end <= start) continue;
      for (let t = start; t + SLOT_MINUTES <= end && out.length < MAX_SLOTS_PER_DAY; t += SLOT_MINUTES) {
        const s = toHHMM(t);
        if (!out.includes(s)) out.push(s);
      }
    } else {
      const mins = toMinutes(entry);
      if (mins === null) continue;
      const s = toHHMM(mins);
      if (!out.includes(s) && out.length < MAX_SLOTS_PER_DAY) out.push(s);
    }
    if (out.length >= MAX_SLOTS_PER_DAY) break;
  }
  return out.sort();
}

/**
 * Earliest bookable slot in the next `horizonDays` days for one provider.
 * `booked` holds "yyyy-MM-dd-HH:MM" keys (same shape the booking modal uses).
 * Returns null when nothing is free in the window.
 */
export function findNextAvailableSlot(
  availabilitySchedule: Record<string, DaySchedule> | null | undefined,
  booked: Set<string>,
  horizonDays = 14,
  now = new Date()
): { date: Date; time: string } | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < horizonDays; i++) {
    const d = addDays(startOfDay(now), i);
    const dayName = format(d, "EEEE").toLowerCase();
    const sched = availabilitySchedule?.[dayName];
    if (sched && !sched.available) continue;
    const pool =
      sched?.hours && sched.hours.length > 0
        ? expandHoursToSlots(sched.hours)
        : DEFAULT_SLOTS;
    const dateStr = format(d, "yyyy-MM-dd");
    for (const t of pool) {
      if (booked.has(`${dateStr}-${t}`)) continue;
      if (isSameDay(d, now)) {
        const mins = toMinutes(t);
        if (mins !== null && mins <= nowMinutes + 30) continue; // 30m lead time
      }
      return { date: d, time: t };
    }
  }
  return null;
}
