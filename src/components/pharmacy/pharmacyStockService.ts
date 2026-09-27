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

/** Receive a new batch. Inserts the batch row plus a 'receipt' ledger movement
 *  (the DB trigger maintains quantity_remaining and stamps performed_by). */
export async function receiveBatch(
  institutionId: string,
  input: ReceiveBatchInput
): Promise<MedicineBatch> {
  const userId = await getCurrentUserId();
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
      quantity_remaining: input.quantity_received,
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
