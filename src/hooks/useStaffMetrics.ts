import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Metric keys declared by StaffDashboard role configs. */
export type StaffMetricKey =
  | "appointments_today"
  | "queue_waiting"
  | "checked_in"
  | "invoices_pending"
  | "revenue_today"
  | "invoices_overdue"
  | "staff_total"
  | "on_shift_today"
  | "on_leave_today"
  | "revenue_total"
  | "patient_volume"
  | "tickets_open"
  | "resolved_today"
  | "avg_response"
  | "dispatches_active"
  | "units_available"
  | "dispatches_completed_today"
  | "triage_waiting"
  | "triage_critical"
  | "assessed_today"
  | "surgeries_today"
  | "surgeries_in_progress"
  | "theatres_available"
  | "maintenance_open"
  | "maintenance_in_progress"
  | "maintenance_completed"
  | "inventory_total"
  | "inventory_low_stock"
  | "inventory_out_of_stock";

export type StaffMetrics = Record<StaffMetricKey, number | null>;

/** Today's date in the user's timezone (Africa/Lusaka), YYYY-MM-DD. */
function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function countWhere(table: string, build: (q: any) => any): Promise<number> {
  const { count, error } = await build(
    (supabase as any).from(table).select("id", { count: "exact", head: true })
  );
  if (error) throw error;
  return count ?? 0;
}

/**
 * Real institution metrics for the staff dashboard.
 * Keys with no backing table stay NULL — the dashboard renders those as "—"
 * with "Not tracked yet" instead of a fake 0.
 */
export function useStaffMetrics(institutionId: string | null) {
  const [metrics, setMetrics] = useState<StaffMetrics>(() =>
    Object.fromEntries(
      [
        "appointments_today","queue_waiting","checked_in","invoices_pending","revenue_today",
        "invoices_overdue","staff_total","on_shift_today","on_leave_today","revenue_total",
        "patient_volume","tickets_open","resolved_today","avg_response","dispatches_active",
        "units_available","dispatches_completed_today","triage_waiting","triage_critical",
        "assessed_today","surgeries_today","surgeries_in_progress","theatres_available",
        "maintenance_open","maintenance_in_progress","maintenance_completed","inventory_total",
        "inventory_low_stock","inventory_out_of_stock",
      ].map((k) => [k, null])
    ) as StaffMetrics
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const today = todayStr();
    const todayStartIso = new Date(`${today}T00:00:00`).toISOString();

    (async () => {
      setLoading(true);
      const m: StaffMetrics = { ...metrics };
      // Reset so stale values are never shown as current.
      (Object.keys(m) as StaffMetricKey[]).forEach((k) => { m[k] = null; });

      const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
        try {
          return await fn();
        } catch (e) {
          console.error("useStaffMetrics query failed:", e);
          return fallback;
        }
      };

      const [
        appointmentsToday,
        queueWaiting,
        checkedIn,
        invoicesPending,
        revenueToday,
        invoicesOverdue,
        staffTotal,
        onShiftToday,
        onLeaveToday,
        revenueTotal,
        patientVolume,
        dispatchesActive,
        dispatchesCompletedToday,
        triageWaiting,
        triageCritical,
        assessedToday,
        surgeriesToday,
        surgeriesInProgress,
        maintenanceOpen,
        maintenanceInProgress,
        maintenanceCompleted,
        inventoryRows,
      ] = await Promise.all([
        // Reception
        safe(() => countWhere("appointments", (q) => q.eq("institution_id", institutionId).eq("date", today).neq("status", "cancelled")), 0),
        safe(() => countWhere("queue_tokens", (q) => q.eq("institution_id", institutionId).eq("status", "waiting")), 0),
        safe(() => countWhere("queue_tokens", (q) => q.eq("institution_id", institutionId).in("status", ["serving", "called"])), 0),
        // Billing
        safe(() => countWhere("billing_invoices", (q) => q.eq("institution_id", institutionId).not("status", "in", "(paid,cancelled,draft)")), 0),
        safe(async () => {
          const { data, error } = await (supabase as any).from("billing_payments")
            .select("amount").eq("institution_id", institutionId).eq("payment_date", today).limit(2000);
          if (error) throw error;
          return (data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        }, 0),
        safe(() => countWhere("billing_invoices", (q) => q.eq("institution_id", institutionId).lt("due_date", today).not("status", "in", "(paid,cancelled,draft)")), 0),
        // HR
        safe(() => countWhere("institution_personnel", (q) => q.eq("institution_id", institutionId)), 0),
        safe(() => countWhere("shift_assignments", (q) => q.eq("institution_id", institutionId).eq("shift_date", today)), 0),
        safe(() => countWhere("leave_requests", (q) => q.eq("institution_id", institutionId).eq("status", "approved").lte("start_date", today).gte("end_date", today)), 0),
        // CXO
        safe(async () => {
          const { data, error } = await (supabase as any).from("billing_payments")
            .select("amount").eq("institution_id", institutionId).limit(5000);
          if (error) throw error;
          return (data || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        }, 0),
        safe(async () => {
          const { data, error } = await supabase.from("appointments")
            .select("patient_id").eq("institution_id", institutionId).limit(2000);
          if (error) throw error;
          return new Set((data || []).map((r: any) => r.patient_id).filter(Boolean)).size;
        }, 0),
        // Ambulance
        safe(() => countWhere("ambulance_dispatches", (q) => q.eq("institution_id", institutionId).in("status", ["dispatched", "en_route", "on_scene"])), 0),
        safe(() => countWhere("ambulance_dispatches", (q) => q.eq("institution_id", institutionId).eq("status", "completed").gte("completed_at", todayStartIso)), 0),
        // Triage
        safe(() => countWhere("queue_tokens", (q) => q.eq("institution_id", institutionId).eq("status", "waiting")), 0),
        safe(() => countWhere("queue_tokens", (q) => q.eq("institution_id", institutionId).eq("status", "waiting").in("priority", ["urgent", "emergency", "critical"])), 0),
        safe(() => countWhere("triage_assessments", (q) => q.eq("institution_id", institutionId).gte("assessed_at", todayStartIso)), 0),
        // OT
        safe(() => countWhere("ot_surgeries", (q) => q.eq("institution_id", institutionId).eq("scheduled_date", today).neq("status", "cancelled")), 0),
        safe(() => countWhere("ot_surgeries", (q) => q.eq("institution_id", institutionId).in("status", ["in_progress", "ongoing"])), 0),
        // Maintenance
        safe(() => countWhere("work_orders", (q) => q.eq("institution_id", institutionId).in("status", ["open", "pending"])), 0),
        safe(() => countWhere("work_orders", (q) => q.eq("institution_id", institutionId).in("status", ["in_progress", "started"])), 0),
        safe(() => countWhere("work_orders", (q) => q.eq("institution_id", institutionId).eq("status", "completed")), 0),
        // Inventory
        safe(async () => {
          const { data, error } = await (supabase as any).from("hospital_inventory")
            .select("quantity_available,reorder_level").eq("institution_id", institutionId).limit(2000);
          if (error) throw error;
          return data || [];
        }, [] as any[]),
      ]);

      m.appointments_today = appointmentsToday;
      m.queue_waiting = queueWaiting;
      m.checked_in = checkedIn;
      m.invoices_pending = invoicesPending;
      m.revenue_today = revenueToday;
      m.invoices_overdue = invoicesOverdue;
      m.staff_total = staffTotal;
      m.on_shift_today = onShiftToday;
      m.on_leave_today = onLeaveToday;
      m.revenue_total = revenueTotal;
      m.patient_volume = patientVolume;
      m.dispatches_active = dispatchesActive;
      m.dispatches_completed_today = dispatchesCompletedToday;
      m.triage_waiting = triageWaiting;
      m.triage_critical = triageCritical;
      m.assessed_today = assessedToday;
      m.surgeries_today = surgeriesToday;
      m.surgeries_in_progress = surgeriesInProgress;
      m.maintenance_open = maintenanceOpen;
      m.maintenance_in_progress = maintenanceInProgress;
      m.maintenance_completed = maintenanceCompleted;
      m.inventory_total = inventoryRows.length;
      m.inventory_low_stock = inventoryRows.filter(
        (r: any) => (r.quantity_available ?? 0) > 0 && (r.reorder_level ?? 0) > 0 && (r.quantity_available ?? 0) <= r.reorder_level
      ).length;
      m.inventory_out_of_stock = inventoryRows.filter((r: any) => (r.quantity_available ?? 0) <= 0).length;
      // No backing tables yet — stay NULL so the UI shows "—" instead of a fake 0:
      // tickets_open, resolved_today, avg_response, units_available, theatres_available

      if (!cancelled) {
        setMetrics(m);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  return { metrics, loading };
}
