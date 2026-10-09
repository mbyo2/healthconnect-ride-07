import { useEffect, useMemo, useRef } from "react";
import { addDays, format, isAfter, isBefore, isSameDay, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const DAYS_TO_SHOW = 30;

type DaySchedule = { available: boolean; hours: string[] };

/**
 * Reference-inspired mobile day strip for the booking modal's date step.
 * The old 7-column grid squeezed each day cell to ~40px on a 360px phone —
 * below the 44px touch target. The strip is a horizontal snap-scrolling
 * list of 30 large day cells (64px+), with an availability dot under days
 * the provider actually works, a Today marker, and auto-centering of the
 * selected day. Desktop keeps the 7-column grid; this renders on <sm only.
 */
export function DayStripPicker({
  selectedDate,
  onSelect,
  schedule,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  schedule?: Record<string, DaySchedule> | null;
}) {
  const today = startOfDay(new Date());
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const days = useMemo(() => {
    // The strip normally starts at today. If the selection (e.g. restored
    // from a pre-login booking) lies beyond the window, start a few days
    // before it so the selection stays visible with context.
    let windowStart = today;
    if (selectedDate) {
      const sel = startOfDay(selectedDate);
      if (isAfter(sel, addDays(today, DAYS_TO_SHOW - 1))) {
        windowStart = addDays(sel, -3);
      }
    }
    return Array.from({ length: DAYS_TO_SHOW }, (_, i) => addDays(windowStart, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate ? format(selectedDate, "yyyy-MM-dd") : "none"]);

  const windowStart = days[0];
  const showTodayJump = isAfter(startOfDay(windowStart), today);

  const hasAvailability = (day: Date): boolean => {
    if (!schedule) return false;
    const key = format(day, "eeee").toLowerCase();
    const s = schedule[key];
    return !!s?.available && (s.hours?.length ?? 0) > 0;
  };

  // Center the selected (or today's) cell when the strip mounts/changes.
  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    (selectedRef.current ?? listRef.current?.querySelector("[data-today='true']"))?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-foreground" aria-live="polite">
          {format(days[0], "MMMM yyyy")}
        </p>
        {showTodayJump && (
          <button
            onClick={() => onSelect(new Date())}
            className="px-3 min-h-[44px] rounded-full text-xs font-bold bg-primary-500/15 text-primary-600 dark:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Back to today
          </button>
        )}
      </div>
      <div
        ref={listRef}
        role="listbox"
        aria-label="Choose a day"
        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
      >
        {days.map((day) => {
          const past = isBefore(day, today);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const todayCell = isToday(day);
          const available = !past && hasAvailability(day);
          return (
            <button
              key={day.toISOString()}
              ref={selected || (!selectedDate && todayCell) ? selectedRef : undefined}
              role="option"
              aria-selected={selected}
              data-today={todayCell || undefined}
              disabled={past}
              aria-label={`${format(day, "EEEE, MMM d")}${todayCell ? ", today" : ""}${past ? ", past" : ""}${available ? ", has availability" : ""}`}
              onClick={() => onSelect(day)}
              className={cn(
                "snap-start shrink-0 w-16 min-h-[76px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                past && "opacity-35 cursor-not-allowed",
                selected && "bg-primary text-primary-foreground shadow-md",
                !selected && !past && "bg-muted hover:bg-primary/10 cursor-pointer",
                todayCell && !selected && "ring-2 ring-primary/40"
              )}
            >
              <span className={cn("text-[11px] font-bold uppercase tracking-wide", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {todayCell ? "Today" : format(day, "EEE")}
              </span>
              <span className="text-xl font-extrabold leading-none">{format(day, "d")}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full mt-1", available ? "bg-emerald-500" : "bg-transparent")} aria-hidden />
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden />
        Dot = provider sees patients that day
      </p>
    </div>
  );
}
