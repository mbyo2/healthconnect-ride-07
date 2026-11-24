import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Movement types accepted by apply_hospital_stock_movement (live DB). */
export type HospitalMovementType =
  | "received"
  | "issued"
  | "transferred"
  | "adjusted"
  | "expired"
  | "damaged"
  | "written_off";

export interface HospitalInventoryMovement {
  id: string;
  institution_id: string;
  item_id: string;
  movement_type: HospitalMovementType | string;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  from_department_id: string | null;
  to_department_id: string | null;
  reason: string | null;
  reference: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface HospitalDepartment {
  id: string;
  hospital_id: string;
  name: string;
  code: string | null;
  description: string | null;
  bed_capacity: number | null;
  is_active: boolean | null;
}

export interface ApplyMovementOptions {
  reason?: string;
  /** Destination department — required for transfers, optional for issues. */
  toDepartmentId?: string;
  reference?: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function throwIf(error: unknown, fallback: string): void {
  if (error) {
    const message = (error as { message?: string }).message || fallback;
    throw new Error(message);
  }
}

export const HOSPITAL_MOVEMENT_LABELS: Record<string, string> = {
  received: "Received",
  issued: "Issued",
  transferred: "Transferred",
  adjusted: "Adjusted",
  expired: "Expired",
  damaged: "Damaged",
  written_off: "Written off",
};

/**
 * Direction wording for a movement-history row.
 *
 * Ledger semantics (apply_hospital_stock_movement): from_department_id is
 * always the department the stock sat in; to_department_id is the transfer
 * destination for transfers and simply mirrors from_department_id for
 * every other type. So the direction word must come from the movement
 * TYPE, never from which column happens to be populated:
 *  - received            → stock arrived INTO the department: "To X"
 *  - transferred         → "From X → To Y"
 *  - issued / adjusted / expired / damaged / written_off
 *                        → stock left (or was corrected at) the
 *                          department: "From X"
 * (The history UI previously printed "To X" for every row with a
 * to_department_id — i.e. all of them — so an issue out of Main Store
 * read "Issued • To Main Store".)
 */
export function movementLocationLabel(
  movement: Pick<HospitalInventoryMovement, "movement_type" | "from_department_id" | "to_department_id">,
  departmentName: (id: string | null) => string | null,
): string | null {
  const fromName = departmentName(movement.from_department_id);
  const toName = departmentName(movement.to_department_id);
  switch (movement.movement_type) {
    case "transferred": {
      if (fromName && toName && movement.from_department_id !== movement.to_department_id) {
        return `From ${fromName} → To ${toName}`;
      }
      if (toName) return `To ${toName}`;
      if (fromName) return `From ${fromName}`;
      return null;
    }
    case "received":
      return toName ? `To ${toName}` : fromName ? `To ${fromName}` : null;
    default:
      return fromName ? `From ${fromName}` : toName ? `From ${toName}` : null;
  }
}

/* ------------------------------------------------------------------ */
/* Movements                                                           */
/* ------------------------------------------------------------------ */

/**
 * Apply a stock movement through the apply_hospital_stock_movement RPC.
 * The RPC is the only quantity-changing path: it row-locks the item,
 * checks staff membership, refuses issues/transfers/write-offs that
 * exceed the stock on hand, updates quantity_available, relocates the
 * item on transfers, and writes the hospital_inventory_movements
 * ledger row with before/after quantities — all atomically.
 *
 * 'adjusted' takes a SIGNED delta (e.g. -3 for a stocktake shortfall,
 * +2 for a found surplus); every other type takes a positive quantity.
 * Returns the movement ledger row id.
 */
export async function applyMovement(
  itemId: string,
  type: HospitalMovementType,
  quantity: number,
  opts: ApplyMovementOptions = {}
): Promise<string> {
  if (!itemId) throw new Error("Choose an item first.");
  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new Error(
      type === "adjusted"
        ? "Enter the adjustment amount — a positive number to add stock, or a negative number to remove it."
        : "Enter a quantity greater than zero."
    );
  }
  if (type !== "adjusted" && quantity < 0) {
    throw new Error("Enter a quantity greater than zero.");
  }
  if (type === "transferred" && !opts.toDepartmentId) {
    throw new Error("Choose the department this stock is moving to.");
  }

  const { data, error } = await (supabase.rpc as any)("apply_hospital_stock_movement", {
    p_item_id: itemId,
    p_movement_type: type,
    p_quantity: quantity,
    p_reason: opts.reason?.trim() || null,
    p_to_department_id: opts.toDepartmentId || null,
    p_reference: opts.reference?.trim() || null,
  });
  throwIf(error, "That stock movement could not be recorded. Please try again.");
  return data as string;
}

/** Convenience wrappers mirroring the workflow's action buttons. */
export const receiveStock = (itemId: string, quantity: number, opts?: ApplyMovementOptions) =>
  applyMovement(itemId, "received", quantity, opts);
export const issueStock = (itemId: string, quantity: number, opts?: ApplyMovementOptions) =>
  applyMovement(itemId, "issued", quantity, opts);
export const transferStock = (itemId: string, quantity: number, opts: ApplyMovementOptions) =>
  applyMovement(itemId, "transferred", quantity, opts);
export const adjustStock = (itemId: string, signedDelta: number, opts?: ApplyMovementOptions) =>
  applyMovement(itemId, "adjusted", signedDelta, opts);
export const writeOffStock = (
  itemId: string,
  quantity: number,
  opts?: ApplyMovementOptions & { kind?: "written_off" | "expired" | "damaged" }
) => applyMovement(itemId, opts?.kind ?? "written_off", quantity, opts);

/** Movement history for an institution, optionally for a single item. */
export async function fetchMovements(
  institutionId: string,
  itemId?: string,
  limit = 300
): Promise<HospitalInventoryMovement[]> {
  let query = (supabase.from("hospital_inventory_movements" as any) as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (itemId) query = query.eq("item_id", itemId);
  const { data, error } = await query;
  throwIf(error, "We couldn't load the stock movement history. Please try again.");
  return ((data as unknown) as HospitalInventoryMovement[]) || [];
}

/* ------------------------------------------------------------------ */
/* Departments (stock locations)                                       */
/* ------------------------------------------------------------------ */

/** Departments of an institution — the stock locations for hospital
 *  inventory. hospital_departments is keyed by hospital_id, which holds
 *  the institution id. */
export async function fetchDepartments(
  institutionId: string
): Promise<HospitalDepartment[]> {
  const { data, error } = await (supabase.from("hospital_departments" as any) as any)
    .select("*")
    .eq("hospital_id", institutionId)
    .order("name", { ascending: true })
    .limit(500);
  throwIf(error, "We couldn't load departments. Please try again.");
  const rows = ((data as unknown) as HospitalDepartment[]) || [];
  return rows.filter((d) => d.is_active !== false);
}

export function departmentName(
  departments: HospitalDepartment[],
  departmentId: string | null | undefined
): string | null {
  if (!departmentId) return null;
  return departments.find((d) => d.id === departmentId)?.name ?? null;
}
