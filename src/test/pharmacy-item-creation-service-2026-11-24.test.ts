/**
 * Item creation for the dispensary stock-control surface (CEO report
 * 2026-11-24: "only seeing receive batch"). The create functions must
 * write to the two LIVE catalogues with exactly the columns the live
 * schema carries, and the pharmacy_inventory write must NOT use a
 * .select() read-back (its SELECT policy would refuse the RETURNING
 * for staff members — the proven MedicineQuickCreateDialog pattern).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

interface InsertCall {
  table: string;
  payload: Record<string, unknown>;
  usedSelect: boolean;
}

let insertCalls: InsertCall[] = [];
let insertError: unknown = null;

function makeChain(table: string) {
  const state: InsertCall = { table, payload: {}, usedSelect: false };
  const chain: Record<string, unknown> = {
    insert: (payload: Record<string, unknown>) => {
      state.payload = payload;
      insertCalls.push(state);
      return chain;
    },
    select: () => {
      state.usedSelect = true;
      return chain;
    },
    single: () =>
      Promise.resolve({
        data: insertError ? null : { id: state.payload.id ?? "med-item-id" },
        error: insertError,
      }),
    then: (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown
    ) =>
      Promise.resolve({ data: null, error: insertError }).then(
        onFulfilled,
        onRejected
      ),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeChain(table),
  },
}));

import {
  createMedicationInventoryItem,
  createPharmacyInventoryItem,
} from "@/components/pharmacy/pharmacyStockService";

const INSTITUTION = "456c9955-1add-4a05-a4b6-4b0c54029ee7";

beforeEach(() => {
  insertCalls = [];
  insertError = null;
});

describe("createPharmacyInventoryItem", () => {
  it("inserts a dispensary item keyed by the institution, quantity 0, generated product code, no read-back", async () => {
    const option = await createPharmacyInventoryItem(INSTITUTION, {
      product_name: "Paracetamol 500mg tablets",
      category: "medication",
      unit_price: 15,
      cost_price: 9,
      manufacturer: "Emzor",
      reorder_level: 20,
    });

    expect(insertCalls).toHaveLength(1);
    const call = insertCalls[0];
    expect(call.table).toBe("pharmacy_inventory");
    expect(call.usedSelect).toBe(false);
    expect(call.payload.pharmacy_id).toBe(INSTITUTION);
    expect(call.payload.product_name).toBe("Paracetamol 500mg tablets");
    expect(call.payload.category).toBe("medication");
    expect(call.payload.quantity).toBe(0);
    expect(call.payload.unit_price).toBe(15);
    expect(call.payload.cost_price).toBe(9);
    expect(String(call.payload.product_code)).toMatch(/^PARACETAMOL-500MG-TABLETS-/);
    expect(option).toEqual({
      id: call.payload.id,
      name: "Paracetamol 500mg tablets",
      table: "pharmacy_inventory",
      quantity: 0,
      unitPrice: 15,
    });
  });

  it("propagates an insert refusal as an error (RLS gate for non-pharmacy users)", async () => {
    insertError = { message: "new row violates row-level security policy" };
    await expect(
      createPharmacyInventoryItem(INSTITUTION, {
        product_name: "Ibuprofen",
        category: "medication",
        unit_price: 10,
      })
    ).rejects.toThrow(/row-level security/);
  });
});

describe("createMedicationInventoryItem", () => {
  it("inserts a medication-catalogue item with the NOT NULL fields the live schema requires", async () => {
    const option = await createMedicationInventoryItem(INSTITUTION, {
      medication_name: "Amoxicillin",
      generic_name: "Amoxicillin",
      dosage: "250mg",
      medication_type: "capsule",
      expiry_date: "2028-01-31",
      unit_price: 3.5,
      minimum_stock_level: 25,
    });

    expect(insertCalls).toHaveLength(1);
    const call = insertCalls[0];
    expect(call.table).toBe("medication_inventory");
    expect(call.payload.institution_id).toBe(INSTITUTION);
    expect(call.payload.medication_name).toBe("Amoxicillin");
    expect(call.payload.dosage).toBe("250mg");
    expect(call.payload.medication_type).toBe("capsule");
    expect(call.payload.expiry_date).toBe("2028-01-31");
    expect(call.payload.quantity_available).toBe(0);
    expect(call.payload.minimum_stock_level).toBe(25);
    expect(option.table).toBe("medication_inventory");
    expect(option.name).toBe("Amoxicillin");
    expect(option.id).toBeTruthy();
  });
});
