import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type QaStatus = "pending" | "approved" | "quarantined" | "rejected";
export type InventoryTable = "pharmacy_inventory" | "medication_inventory";
export type ExpiryBand = "all" | "expired" | "le30" | "le90" | "ok";
export type AuditScope = "full" | "partial" | "cycle";
export type AuditStatus = "open" | "submitted" | "approved" | "cancelled";
export type WriteOffStatus = "pending_approval" | "approved" | "rejected" | "posted";
export type WriteOffReason = "expired" | "damaged" | "broken" | "temperature" | "stolen" | "other";

export interface MedicineBatch {
  id: string;
  institution_id: string;
  inventory_table: InventoryTable;
  inventory_item_id: string;
  product_name: string;
  batch_number: string;
  manufacturer: string | null;
  supplier_id: string | null;
  manufacture_date: string | null;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  unit_price: number | null;
  qa_status: QaStatus;
  qa_checked_by: string | null;
  qa_checked_at: string | null;
  qa_notes: string | null;
  received_by: string | null;
  received_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BatchStockMovement {
  id: string;
  institution_id: string;
  batch_id: string;
  movement_type:
    | "receipt"
    | "dispense"
    | "sale"
    | "adjustment"
    | "write_off"
    | "transfer_in"
    | "transfer_out"
    | "return"
    | "qa_quarantine"
    | "qa_release";
  quantity_change: number;
  quantity_after: number;
  unit_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockAuditSession {
  id: string;
  institution_id: string;
  title: string;
  scope: AuditScope;
  status: AuditStatus;
  started_by: string | null;
  started_at: string;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAuditLine {
  id: string;
  session_id: string;
  batch_id: string;
  book_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  variance_value: number | null;
  counted_by: string | null;
  counted_at: string | null;
  notes: string | null;
  created_at: string;
  medicine_batches?: {
    product_name: string;
    batch_number: string;
    expiry_date: string;
    unit_cost: number;
  } | null;
}

export interface StockWriteOff {
  id: string;
  institution_id: string;
  inventory_item_id: string | null;
  inventory_table: InventoryTable;
  product_name: string;
  batch_number: string | null;
  batch_id: string | null;
  quantity_written_off: number;
  cost_per_unit: number;
  total_loss: number;
  reason: WriteOffReason;
  notes: string | null;
  written_off_by: string | null;
  written_off_at: string;
  approved_by: string | null;
  approved_at: string | null;
  status: WriteOffStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface StockValuationRow {
  institution_id: string;
  inventory_table: InventoryTable;
  inventory_item_id: string;
  product_name: string;
  total_units: number;
  stock_value: number;
  batch_count: number;
  earliest_expiry: string | null;
}

export interface WriteOffSummaryRow {
  institution_id: string;
  month: string;
  reason: WriteOffReason;
  status: WriteOffStatus;
  writeoff_count: number;
  total_loss: number;
}

export interface BatchFilters {
  search?: string;
  qaStatus?: QaStatus | "all";
  expiryBand?: ExpiryBand;
  inventoryTable?: InventoryTable | "all";
}

export interface ReceiveBatchInput {
  inventory_table: InventoryTable;
  inventory_item_id: string;
  product_name: string;
  batch_number: string;
  manufacturer?: string;
  manufacture_date?: string;
  expiry_date: string;
  quantity_received: number;
  unit_cost: number;
  unit_price?: number;
}

export interface RequestWriteOffInput {
  inventory_table: InventoryTable;
  inventory_item_id: string;
  product_name: string;
  batch_number?: string;
  batch_id?: string;
  quantity_written_off: number;
  cost_per_unit: number;
  reason: WriteOffReason;
  notes?: string;
}

export interface DispenseAllocation {
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function throwIf(error: unknown, fallback: string): void {
  if (error) {
    const message = (error as { message?: string }).message || fallback;
    throw new Error(message);
  }
}

/** Days from today until expiry (negative when expired). */
export function daysToExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function expiryBandOf(expiryDate: string): Exclude<ExpiryBand, "all"> {
  const days = daysToExpiry(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "le30";
  if (days <= 90) return "le90";
  return "ok";
}

export const EXPIRY_BAND_LABELS: Record<Exclude<ExpiryBand, "all">, string> = {
  expired: "Expired",
  le30: "Expiring within 30 days",
  le90: "Expiring in 31–90 days",
  ok: "Healthy stock",
};

/* ------------------------------------------------------------------ */
/* Batches                                                             */
/* ------------------------------------------------------------------ */

export async function listBatches(
  institutionId: string,
  filters: BatchFilters = {}
): Promise<MedicineBatch[]> {
  let query = supabase
    .from("medicine_batches" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .eq("is_active", true)
    .order("expiry_date", { ascending: true })
    .limit(1000);

  if (filters.qaStatus && filters.qaStatus !== "all") {
    query = query.eq("qa_status", filters.qaStatus);
  }
  if (filters.inventoryTable && filters.inventoryTable !== "all") {
    query = query.eq("inventory_table", filters.inventoryTable);
  }
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    query = query.or(`product_name.ilike.%${term}%,batch_number.ilike.%${term}%`);
  }

  const { data, error } = await query;
  throwIf(error, "Failed to load batches");
  let rows = ((data as unknown) as MedicineBatch[]) || [];
  if (filters.expiryBand && filters.expiryBand !== "all") {
    rows = rows.filter((b) => expiryBandOf(b.expiry_date) === filters.expiryBand);
  }
  return rows;
}

/** Receive a new batch. Inserts the batch row with quantity_remaining = 0 plus a
 *  'receipt' ledger movement — the apply_batch_movement trigger performs the
 *  single initialization (inserting with quantity_received here would double
 *  it, GAP-01). Rejects duplicate batch numbers with a friendly error (GAP-09). */
export async function receiveBatch(
  institutionId: string,
  input: ReceiveBatchInput
): Promise<MedicineBatch> {
  const userId = await getCurrentUserId();

  // GAP-09: pre-check the UNIQUE (institution_id, inventory_table,
  // inventory_item_id, batch_number) constraint so a re-received batch number
  // fails with guidance instead of a raw unique-violation error.
  const { data: existing, error: dupError } = await supabase
    .from("medicine_batches" as any)
    .select("id")
    .eq("institution_id", institutionId)
    .eq("inventory_table", input.inventory_table)
    .eq("inventory_item_id", input.inventory_item_id)
    .eq("batch_number", input.batch_number)
    .limit(1);
  if (dupError) {
    throw new Error((dupError as { message?: string }).message || "Failed to check existing batches");
  }
  if (existing && (existing as unknown as any[]).length > 0) {
    throw new Error(
      `Batch "${input.batch_number}" was already received for this product — use a new batch number or add a PO reference.`
    );
  }

  const { data: batch, error: batchError } = await supabase
    .from("medicine_batches" as any)
    .insert({
      institution_id: institutionId,
      inventory_table: input.inventory_table,
      inventory_item_id: input.inventory_item_id,
      product_name: input.product_name,
      batch_number: input.batch_number,
      manufacturer: input.manufacturer || null,
      manufacture_date: input.manufacture_date || null,
      expiry_date: input.expiry_date,
      quantity_received: input.quantity_received,
      // GAP-01: 0 here — the receipt movement below is the single
      // initialization via the apply_batch_movement trigger.
      quantity_remaining: 0,
      unit_cost: input.unit_cost,
      unit_price: input.unit_price ?? null,
      received_by: userId,
    })
    .select("*")
    .single();
  throwIf(batchError, "Failed to create batch");
  const created = (batch as unknown) as MedicineBatch;

  const { error: movementError } = await supabase
    .from("batch_stock_movements" as any)
    .insert({
      institution_id: institutionId,
      batch_id: created.id,
      movement_type: "receipt",
      quantity_change: input.quantity_received,
      quantity_after: 0, // recomputed by the apply_batch_movement trigger
      unit_cost: input.unit_cost,
      reference_type: "receipt",
      notes: `Batch ${input.batch_number} received`,
    });
  throwIf(movementError, "Batch created but receipt movement failed");
  return created;
}

export async function setQaStatus(
  batchId: string,
  status: QaStatus,
  notes?: string
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not signed in");

  // Load the current batch row (for separation-of-duties + audit).
  const { data: batch, error: fetchError } = await supabase
    .from("medicine_batches" as any)
    .select("id, institution_id, qa_status, qa_checked_by")
    .eq("id", batchId)
    .single();
  throwIf(fetchError, "Failed to load batch");
  const prev = (batch as any) ?? {};

  // Release separation of duties: the user releasing a quarantined batch
  // must differ from the user who quarantined it.
  const isRelease = prev.qa_status === "quarantined" && status === "approved";
  if (isRelease && prev.qa_checked_by && prev.qa_checked_by === userId) {
    throw new Error(
      "Separation of duties: the user who quarantined this batch cannot release it. Ask a second pharmacist to release."
    );
  }

  const { error } = await supabase
    .from("medicine_batches" as any)
    .update({
      qa_status: status,
      qa_checked_by: userId,
      qa_checked_at: new Date().toISOString(),
      qa_notes: notes || null,
    })
    .eq("id", batchId);
  throwIf(error, "Failed to update QA status");

  // Append the immutable QA event (append-only audit log).
  const action = isRelease ? "released" : status;
  const { error: eventError } = await supabase
    .from("batch_qa_events" as any)
    .insert({
      batch_id: batchId,
      institution_id: prev.institution_id,
      action,
      previous_status: prev.qa_status ?? null,
      new_status: status,
      decided_by: userId,
      notes: notes || null,
    });
  // The audit event must not be silently lost.
  throwIf(eventError, "QA status saved but audit event failed — contact support");
}

export async function getBatchMovements(batchId: string): Promise<BatchStockMovement[]> {
  const { data, error } = await supabase
    .from("batch_stock_movements" as any)
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false })
    .limit(200);
  throwIf(error, "Failed to load batch movements");
  return ((data as unknown) as BatchStockMovement[]) || [];
}

/** FEFO dispense via the atomic DB function (earliest expiry first). */
export async function dispenseFEFO(
  institutionId: string,
  inventoryTable: InventoryTable,
  inventoryItemId: string,
  quantity: number,
  opts: { referenceType?: string; referenceId?: string; notes?: string } = {}
): Promise<{ allocated: DispenseAllocation[]; total: number }> {
  const { data, error } = await (supabase.rpc as any)("dispense_medicine_batches", {
    p_institution_id: institutionId,
    p_inventory_table: inventoryTable,
    p_inventory_item_id: inventoryItemId,
    p_quantity: quantity,
    p_reference_type: opts.referenceType ?? null,
    p_reference_id: opts.referenceId ?? null,
    p_notes: opts.notes ?? null,
  });
  throwIf(error, "FEFO dispense failed");
  return data as { allocated: DispenseAllocation[]; total: number };
}

/* ------------------------------------------------------------------ */
/* FEFO sale / fulfillment helpers (GAP-02 + GAP-03 + GAP-04)           */
/* ------------------------------------------------------------------ */

export interface DispenseLine {
  inventoryTable: InventoryTable;
  inventoryItemId: string;
  quantity: number;
  productName?: string;
}

/** Resolve a product name to an inventory item id. Exact case-insensitive
 *  match wins; a single contains-match is accepted as fallback; zero or
 *  ambiguous matches return null so the caller can abort cleanly. */
export async function resolveInventoryItem(
  institutionId: string,
  inventoryTable: InventoryTable,
  productName: string
): Promise<{ id: string; name: string } | null> {
  const term = (productName || "").trim();
  if (!term) return null;

  const table = inventoryTable === "medication_inventory" ? "medication_inventory" : "pharmacy_inventory";
  const idColumn = table === "medication_inventory" ? "institution_id" : "pharmacy_id";
  const nameColumn = table === "medication_inventory" ? "medication_name" : "product_name";
  const selectCols = table === "medication_inventory" ? "id, medication_name" : "id, product_name";

  // Try exact/contains match first (prescription name in inventory)
  const { data, error } = await supabase
    .from(table as any)
    .select(selectCols)
    .eq(idColumn, institutionId)
    .ilike(nameColumn, `%${term}%`)
    .limit(20);
  if (error) return null;
  let rows = ((data as unknown) as any[]) || [];

  // If no match, try reverse: inventory name contained in prescription term
  // (e.g., prescription "Amoxicillin 500mg" vs inventory "Amoxicillin").
  // Fetch candidates and match in JS for bidirectional containment.
  if (rows.length === 0) {
    const baseTerm = term.split(/\s+/)[0]; // first word, e.g., "Amoxicillin"
    if (baseTerm && baseTerm.length >= 3) {
      const { data: revData } = await supabase
        .from(table as any)
        .select(selectCols)
        .eq(idColumn, institutionId)
        .ilike(nameColumn, `%${baseTerm}%`)
        .limit(20);
      rows = ((revData as unknown) as any[]) || [];
    }
  }
  if (rows.length === 0) return null;

  const exact = rows.find((r) => String(r[nameColumn]).toLowerCase() === term.toLowerCase());
  if (exact) return { id: exact.id, name: String(exact[nameColumn]) };
  if (rows.length === 1) return { id: rows[0].id, name: String(rows[0][nameColumn]) };
  return null; // ambiguous — caller reports it as unresolvable
}

/** Sum of approved, unexpired, positive-balance batch stock for one item —
 *  the quantity FEFO could actually dispense right now. */
export async function dispensableStock(
  institutionId: string,
  inventoryTable: InventoryTable,
  inventoryItemId: string
): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("medicine_batches" as any)
    .select("quantity_remaining")
    .eq("institution_id", institutionId)
    .eq("inventory_table", inventoryTable)
    .eq("inventory_item_id", inventoryItemId)
    .eq("is_active", true)
    .eq("qa_status", "approved")
    .gte("expiry_date", today)
    .gt("quantity_remaining", 0);
  if (error) return 0;
  return (((data as unknown) as { quantity_remaining: number }[]) || []).reduce(
    (sum, r) => sum + (Number(r.quantity_remaining) || 0),
    0
  );
}

/** Pre-check every line against dispensable (approved, unexpired) batch stock.
 *  Throws a friendly error on the first shortfall — call BEFORE writing any
 *  sale/prescription/order rows so a failed fulfillment leaves the ledger
 *  untouched (no partial fulfillment). */
export async function precheckDispenseLines(
  institutionId: string,
  lines: DispenseLine[]
): Promise<void> {
  for (const line of lines) {
    const qty = Math.max(1, Math.round(line.quantity));
    const available = await dispensableStock(
      institutionId,
      line.inventoryTable,
      line.inventoryItemId
    );
    if (available < qty) {
      throw new Error(
        `Insufficient dispensable stock for "${line.productName || line.inventoryItemId}": ` +
          `need ${qty}, have ${available} approved, unexpired units. ` +
          `Receive and QA-approve a batch first.`
      );
    }
  }
}

/** Pre-check then FEFO-dispense each line in turn (auto-FEFO at sale time —
 *  no per-batch UI needed). The RPC is atomic per line; the pre-check above
 *  is what guarantees a shortfall aborts before any ledger write. */
export async function dispenseLinesFEFO(
  institutionId: string,
  lines: DispenseLine[],
  opts: { referenceType?: string; referenceId?: string; notes?: string } = {}
): Promise<void> {
  await precheckDispenseLines(institutionId, lines);
  for (const line of lines) {
    await dispenseFEFO(
      institutionId,
      line.inventoryTable,
      line.inventoryItemId,
      Math.max(1, Math.round(line.quantity)),
      {
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        notes: opts.notes || (line.productName ? `FEFO dispense — ${line.productName}` : undefined),
      }
    );
  }
}

/** Auto-quarantine every approved batch whose expiry date has passed. Returns count. */
export async function quarantineExpired(institutionId: string): Promise<number> {
  const { data, error } = await (supabase.rpc as any)("quarantine_expired_batches", {
    p_institution_id: institutionId,
  });
  throwIf(error, "Failed to quarantine expired batches");
  return (data as number) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Stock audits                                                        */
/* ------------------------------------------------------------------ */

export async function startAuditSession(
  institutionId: string,
  title: string,
  scope: AuditScope,
  notes?: string
): Promise<StockAuditSession> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("stock_audit_sessions" as any)
    .insert({
      institution_id: institutionId,
      title,
      scope,
      started_by: userId,
      notes: notes || null,
    })
    .select("*")
    .single();
  throwIf(error, "Failed to start audit session");
  return (data as unknown) as StockAuditSession;
}

export async function listAuditSessions(institutionId: string): Promise<StockAuditSession[]> {
  const { data, error } = await supabase
    .from("stock_audit_sessions" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })
    .limit(200);
  throwIf(error, "Failed to load audit sessions");
  return ((data as unknown) as StockAuditSession[]) || [];
}

export async function getAuditSession(sessionId: string): Promise<{
  session: StockAuditSession;
  lines: StockAuditLine[];
}> {
  const { data: session, error: sessionError } = await supabase
    .from("stock_audit_sessions" as any)
    .select("*")
    .eq("id", sessionId)
    .single();
  throwIf(sessionError, "Audit session not found");

  const { data: lines, error: linesError } = await supabase
    .from("stock_audit_lines" as any)
    .select("*, medicine_batches(product_name, batch_number, expiry_date, unit_cost)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  throwIf(linesError, "Failed to load audit lines");

  return {
    session: (session as unknown) as StockAuditSession,
    lines: ((lines as unknown) as StockAuditLine[]) || [],
  };
}

export async function addBatchesToSession(
  sessionId: string,
  batches: Pick<MedicineBatch, "id" | "quantity_remaining">[]
): Promise<void> {
  if (batches.length === 0) return;
  const rows = batches.map((b) => ({
    session_id: sessionId,
    batch_id: b.id,
    book_quantity: b.quantity_remaining,
  }));
  const { error } = await supabase
    .from("stock_audit_lines" as any)
    .upsert(rows, { onConflict: "session_id,batch_id", ignoreDuplicates: true });
  throwIf(error, "Failed to add batches to session");
}

export async function recordCount(
  lineId: string,
  countedQuantity: number,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from("stock_audit_lines" as any)
    .update({ counted_quantity: countedQuantity, notes: notes ?? null })
    .eq("id", lineId);
  throwIf(error, "Failed to record count");
}

export async function submitSession(sessionId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("stock_audit_sessions" as any)
    .update({
      status: "submitted",
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "open");
  throwIf(error, "Failed to submit audit session");
}

export async function approveSession(sessionId: string): Promise<{ posted_adjustments: number }> {
  const { data, error } = await (supabase.rpc as any)("approve_stock_audit_session", {
    p_session_id: sessionId,
  });
  throwIf(error, "Failed to approve audit session");
  return (data as { posted_adjustments: number }) ?? { posted_adjustments: 0 };
}

export async function cancelSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("stock_audit_sessions" as any)
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .eq("status", "open");
  throwIf(error, "Failed to cancel audit session");
}

/* ------------------------------------------------------------------ */
/* Write-offs                                                          */
/* ------------------------------------------------------------------ */

export async function requestWriteOff(
  institutionId: string,
  input: RequestWriteOffInput
): Promise<StockWriteOff> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("stock_writeoffs" as any)
    .insert({
      institution_id: institutionId,
      inventory_item_id: input.inventory_item_id,
      inventory_table: input.inventory_table,
      product_name: input.product_name,
      batch_number: input.batch_number || null,
      batch_id: input.batch_id || null,
      quantity_written_off: input.quantity_written_off,
      cost_per_unit: input.cost_per_unit,
      reason: input.reason,
      notes: input.notes || null,
      written_off_by: userId,
    })
    .select("*")
    .single();
  throwIf(error, "Failed to request write-off");
  return (data as unknown) as StockWriteOff;
}

export async function listWriteOffs(
  institutionId: string,
  status?: WriteOffStatus | "all"
): Promise<StockWriteOff[]> {
  let query = supabase
    .from("stock_writeoffs" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("written_off_at", { ascending: false })
    .limit(500);
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  throwIf(error, "Failed to load write-offs");
  return ((data as unknown) as StockWriteOff[]) || [];
}

export async function approveWriteOff(writeOffId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("stock_writeoffs" as any)
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", writeOffId)
    .eq("status", "pending_approval");
  throwIf(error, "Failed to approve write-off (approver must differ from requester)");
}

export async function rejectWriteOff(writeOffId: string, rejectionReason: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("stock_writeoffs" as any)
    .update({
      status: "rejected",
      rejection_reason: rejectionReason,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", writeOffId)
    .eq("status", "pending_approval");
  throwIf(error, "Failed to reject write-off");
}

export async function postWriteOff(writeOffId: string): Promise<void> {
  const { error } = await (supabase.rpc as any)("post_stock_writeoff", {
    p_writeoff_id: writeOffId,
  });
  throwIf(error, "Failed to post write-off");
}

/* ------------------------------------------------------------------ */
/* Accounting views                                                    */
/* ------------------------------------------------------------------ */

export async function getValuation(institutionId: string): Promise<StockValuationRow[]> {
  const { data, error } = await supabase
    .from("pharmacy_stock_valuation" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("product_name", { ascending: true });
  throwIf(error, "Failed to load stock valuation");
  return ((data as unknown) as StockValuationRow[]) || [];
}

export async function getWriteoffSummary(institutionId: string): Promise<WriteOffSummaryRow[]> {
  const { data, error } = await supabase
    .from("pharmacy_writeoff_summary" as any)
    .select("*")
    .eq("institution_id", institutionId)
    .order("month", { ascending: false });
  throwIf(error, "Failed to load write-off summary");
  return ((data as unknown) as WriteOffSummaryRow[]) || [];
}

/* ------------------------------------------------------------------ */
/* Inventory item pickers (for the receive-batch dialog)               */
/* ------------------------------------------------------------------ */

export interface InventoryItemOption {
  id: string;
  name: string;
  table: InventoryTable;
  quantity: number;
  unitPrice: number | null;
}

export async function listInventoryItemOptions(
  pharmacyInventoryId: string | undefined,
  institutionId: string | undefined
): Promise<InventoryItemOption[]> {
  const options: InventoryItemOption[] = [];
  if (pharmacyInventoryId) {
    const { data } = await supabase
      .from("pharmacy_inventory" as any)
      .select("id, product_name, quantity, unit_price")
      .eq("pharmacy_id", pharmacyInventoryId)
      .order("product_name")
      .limit(1000);
    for (const row of ((data as unknown) as any[]) || []) {
      options.push({
        id: row.id,
        name: row.product_name,
        table: "pharmacy_inventory",
        quantity: row.quantity ?? 0,
        unitPrice: row.unit_price ?? null,
      });
    }
  }
  if (institutionId) {
    const { data } = await supabase
      .from("medication_inventory" as any)
      .select("id, medication_name, quantity_available")
      .eq("institution_id", institutionId)
      .order("medication_name")
      .limit(1000);
    for (const row of ((data as unknown) as any[]) || []) {
      options.push({
        id: row.id,
        name: row.medication_name,
        table: "medication_inventory",
        quantity: row.quantity_available ?? 0,
        unitPrice: null,
      });
    }
  }
  return options;
}
