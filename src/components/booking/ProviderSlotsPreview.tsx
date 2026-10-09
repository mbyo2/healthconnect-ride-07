import { useEffect, useState } from "react";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback pool when the provider publishes no schedule at all. */
const DEFAULT_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

const SLOT_MINUTES = 30;
const MAX_SLOTS_PER_DAY = 16;

type DaySchedule = { available: boolean; hours?: string[] };

interface DaySlots {
  date: Date;
  slots: string[];
}

const toMinutes = (t: string): number | null => {
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
 * bookable times. Expand each entry into 30-minute slots so the chips show
 * real bookable times. Bare "HH:MM" entries are kept as-is; malformed
 * entries are ignored rather than rendered.
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
 * "Nearest available slots" — Zocdoc-style date-grouped time chips on the
 * provider profile. Shows real availability: the provider's weekly schedule
 * (ranges expanded to 30-min slots) intersected with already-booked
 * appointments. Tapping a chip jumps straight into booking with that slot
 * preselected.
 */
export function ProviderSlotsPreview({
  providerId,
  availabilitySchedule,
  onSelectSlot,
}: {
  providerId: string;
  availabilitySchedule?: Record<string, DaySchedule> | null;
  onSelectSlot: (date: Date, time: string) => void;
}) {
  const [days, setDays] = useState<DaySlots[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const upcoming: Date[] = [];
        const now = new Date();
        for (let i = 0; i < 14 && upcoming.length < 4; i++) {
          const d = addDays(startOfDay(now), i);
          const dayName = format(d, "EEEE").toLowerCase();
          const sched = availabilitySchedule?.[dayName];
          // No schedule published → assume bookable (modal handles the rest)
          if (sched && !sched.available) continue;
          upcoming.push(d);
        }

        if (upcoming.length === 0) {
          if (!cancelled) { setDays([]); setLoading(false); }
          return;
        }

        const from = format(upcoming[0], "yyyy-MM-dd");
        const to = format(upcoming[upcoming.length - 1], "yyyy-MM-dd");
        const { data } = await (supabase as any)
          .from("appointments")
          .select("date, time")
          .eq("provider_id", providerId)
          .in("status", ["scheduled", "confirmed"])
          .gte("date", from)
          .lte("date", to);
        const booked = new Set(
          (data || []).map((a: any) => `${a.date}-${String(a.time).slice(0, 5)}`)
        );

        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const result: DaySlots[] = upcoming.map((d) => {
          const dayName = format(d, "EEEE").toLowerCase();
          const sched = availabilitySchedule?.[dayName];
          const pool =
            sched?.hours && sched.hours.length > 0
              ? expandHoursToSlots(sched.hours)
              : DEFAULT_SLOTS;
          const dateStr = format(d, "yyyy-MM-dd");
          const slots = pool.filter((t) => {
            if (booked.has(`${dateStr}-${t}`)) return false;
            if (isSameDay(d, now)) {
              const mins = toMinutes(t);
              if (mins !== null && mins <= nowMinutes + 30) return false; // 30m lead time
            }
            return true;
          });
          return { date: d, slots };
        }).filter((d) => d.slots.length > 0);

        if (!cancelled) setDays(result.slice(0, 4));
      } catch {
        if (!cancelled) setDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [providerId, availabilitySchedule]);

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading available slots">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div>
      </div>
    );
  }

  if (days.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-canvas-silk dark:border-slate-800 shadow-xs space-y-4">
      <h3 className="font-extrabold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
        <CalendarClock className="h-4 w-4 text-primary-500" aria-hidden />
        Nearest available slots
      </h3>
      <div className="space-y-3">
        {days.map(({ date, slots }) => (
          <div key={date.toISOString()}>
            <p className="text-xs font-bold text-graphite-500 dark:text-slate-400 mb-1.5">
              {format(date, "EEE, MMM d")}
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.slice(0, 4).map((t) => (
                <button
                  key={t}
                  onClick={() => onSelectSlot(date, t)}
                  className={cn(
                    "px-4 py-2 min-h-[44px] rounded-full text-sm font-bold border transition-all",
                    "border-primary-500/40 text-primary-600 dark:text-primary-400",
                    "hover:bg-primary-500 hover:text-white hover:border-primary-500",
                    "focus-visible:outline-2 focus-visible:outline-primary"
                  )}
                  aria-label={`Book ${format(date, "EEEE, MMMM d")} at ${t}`}
                >
                  {t}
                </button>
              ))}
              {slots.length > 4 && (
                <button
                  onClick={() => onSelectSlot(date, slots[4])}
                  className="px-3 py-2 min-h-[44px] rounded-full text-xs font-bold text-graphite-500 hover:text-primary-500"
                  aria-label={`See ${slots.length - 4} more times on ${format(date, "EEEE, MMMM d")}`}
                >
                  +{slots.length - 4} more
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
