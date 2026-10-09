import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Provider } from "@/types/provider";
import { findNextAvailableSlot, type DaySchedule } from "@/utils/availability";
import { cn } from "@/lib/utils";

/**
 * One batched query for every provider on screen: their booked
 * (scheduled/confirmed) appointments over the next 14 days. Returns
 * providerId -> Set<"yyyy-MM-dd-HH:MM">. Single round-trip instead of
 * one query per result card.
 */
export function useBookedSlots(providerIds: string[]) {
  const [bookedByProvider, setBookedByProvider] = useState<Map<string, Set<string>>>(new Map());
  const key = useMemo(() => [...providerIds].sort().join(","), [providerIds]);

  useEffect(() => {
    if (providerIds.length === 0) {
      setBookedByProvider(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const from = format(new Date(), "yyyy-MM-dd");
        const to = format(addDays(new Date(), 14), "yyyy-MM-dd");
        const { data } = await (supabase as any)
          .from("appointments")
          .select("provider_id, date, time")
          .in("provider_id", providerIds)
          .in("status", ["scheduled", "confirmed"])
          .gte("date", from)
          .lte("date", to);
        if (cancelled) return;
        const map = new Map<string, Set<string>>();
        for (const a of data || []) {
          const k = `${a.date}-${String(a.time).slice(0, 5)}`;
          if (!map.has(a.provider_id)) map.set(a.provider_id, new Set());
          map.get(a.provider_id)!.add(k);
        }
        setBookedByProvider(map);
      } catch {
        if (!cancelled) setBookedByProvider(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return bookedByProvider;
}

/**
 * "Next free: Tue 10:00" — Zocdoc-style availability chip on the search
 * result card, so patients never tap into a dead end. Renders nothing
 * until the batched booked-slots query resolves (no layout shift from
 * placeholder guesses).
 */
export function NextAvailableChip({
  provider,
  booked,
}: {
  provider: Provider;
  booked: Set<string> | undefined;
}) {
  const next = useMemo(() => {
    if (!booked) return undefined; // still loading — render nothing yet
    const schedule = (provider as any).availability_schedule as
      | Record<string, DaySchedule>
      | null
      | undefined;
    return findNextAvailableSlot(schedule, booked, 14);
  }, [provider, booked]);

  if (next === undefined) return null;

  if (next === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-graphite-500 dark:text-slate-400">
        <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden />
        No open slots in the next 14 days
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold",
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
      )}
      aria-label={`Next available: ${format(next.date, "EEEE, MMMM d")} at ${next.time}`}
    >
      <CalendarCheck2 className="h-3.5 w-3.5" aria-hidden />
      Next free: {format(next.date, "EEE")} {next.time}
    </span>
  );
}
