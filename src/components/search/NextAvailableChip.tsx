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
    // Seed every visible provider with an empty set FIRST, so cards render
    // their availability chip on first paint (no bookings is the common
    // case). Previously providers with zero booked rows had no map entry at
    // all, and their chip never rendered. The rpc then merges real occupancy.
    const seed = new Map<string, Set<string>>(
      providerIds.map((id) => [id, new Set<string>()])
    );
    setBookedByProvider(seed);
    let cancelled = false;
    (async () => {
      try {
        const from = format(new Date(), "yyyy-MM-dd");
        const to = format(addDays(new Date(), 14), "yyyy-MM-dd");
        // SECURITY DEFINER rpc (see migration 20261009_provider_booked_slots_rpc):
        // direct appointments SELECTs are RLS-blind to other patients'
        // bookings, so occupancy must come from the rpc.
        const { data } = await (supabase as any).rpc("get_provider_booked_slots", {
          p_provider_ids: providerIds,
          p_from: from,
          p_to: to,
        });
        if (cancelled) return;
        const map = new Map<string, Set<string>>(
          providerIds.map((id) => [id, new Set<string>()])
        );
        for (const a of data || []) {
          const k = `${a.slot_date}-${String(a.slot_time).slice(0, 5)}`;
          if (!map.has(a.provider_id)) map.set(a.provider_id, new Set());
          map.get(a.provider_id)!.add(k);
        }
        setBookedByProvider(map);
      } catch {
        // On failure keep the seeded empty sets: chips render from schedule
        // alone rather than vanishing.
        if (!cancelled) setBookedByProvider(seed);
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
 * result card, so patients never tap into a dead end. Renders from the
 * provider's schedule immediately (seeded empty occupancy) and corrects
 * itself when the batched booked-slots query resolves.
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
