/**
 * Companion pin for the 2026-10-29 /pharmacy-inventory crash report:
 * the page component itself must render the EXACT row shapes present in
 * the live medication_inventory table (verified 2026-10-29: two rows,
 * unit_price NULL on both) plus the nullable-column shapes the live
 * schema permits (minimum_stock_level NULL). If a future change makes
 * the component throw on any of these shapes, this test catches the
 * crash class at the surface the CEO actually hit.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The two rows exactly as they exist live (2026-10-29), plus one
// synthetic row exercising the schema-nullable fields.
const LIVE_ROWS = [
  {
    id: "234c6df1-d358-480f-a5a9-223419b958f1",
    institution_id: "456c9955-1add-4a05-a4b6-4b0c54029ee7",
    medication_name: "Paracetamol",
    generic_name: "",
    dosage: "500mg",
    medication_type: "tablet",
    manufacturer: "",
    batch_number: "",
    expiry_date: "2027-12-31",
    quantity_available: 70,
    minimum_stock_level: 10,
    unit_price: null,
    cost_price: "0.00",
    supplier_name: null,
    purchase_order_ref: null,
    created_at: "2026-10-09 10:19:23.889241+00",
    updated_at: "2026-10-09 10:26:06.519921+00",
  },
  {
    id: "5a9056d2-7951-496c-b2d9-d898192db143",
    institution_id: "456c9955-1add-4a05-a4b6-4b0c54029ee7",
    medication_name: "Amoxicillin",
    generic_name: "",
    dosage: "500mg",
    medication_type: "tablet",
    manufacturer: "",
    batch_number: "",
    expiry_date: "2028-10-19",
    quantity_available: 100,
    minimum_stock_level: 10,
    unit_price: null,
    cost_price: "0.00",
    supplier_name: null,
    purchase_order_ref: null,
    created_at: "2026-10-19 07:28:45.979931+00",
    updated_at: "2026-10-19 07:33:11.681971+00",
  },
  {
    id: "7c000000-0000-4000-8000-000000000003",
    institution_id: "456c9955-1add-4a05-a4b6-4b0c54029ee7",
    medication_name: "Cetirizine",
    generic_name: null,
    dosage: "10mg",
    medication_type: "tablet",
    manufacturer: null,
    batch_number: null,
    expiry_date: "2027-06-30",
    quantity_available: 5,
    minimum_stock_level: null,
    unit_price: 12.5,
    cost_price: null,
    supplier_name: null,
    purchase_order_ref: null,
    created_at: "2026-10-20 08:00:00+00",
    updated_at: "2026-10-20 08:00:00+00",
  },
];

let queryData: unknown[] = LIVE_ROWS;

function makeChain() {
  const result = Promise.resolve({ data: queryData, error: null });
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      result.then(onFulfilled, onRejected),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeChain(),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "qa-user" } }),
}));

vi.mock("@/hooks/useInstitutionContext", () => ({
  useInstitutionContext: () => ({
    institutionId: "456c9955-1add-4a05-a4b6-4b0c54029ee7",
    loading: false,
  }),
}));

vi.mock("@/hooks/use-currency", () => ({
  useCurrency: () => ({
    formatPrice: (n: number) => `K${Number(n).toFixed(2)}`,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { MedicationInventory } from "@/components/pharmacy/MedicationInventory";

function renderInventory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MedicationInventory />
    </QueryClientProvider>
  );
}

describe("MedicationInventory — live row shapes", () => {
  beforeEach(() => {
    queryData = LIVE_ROWS;
  });

  it("renders the live rows (unit_price NULL included) without crashing", async () => {
    renderInventory();
    expect(await screen.findByText("Paracetamol")).toBeInTheDocument();
    expect(await screen.findByText("Amoxicillin")).toBeInTheDocument();
    // NULL unit_price rows show N/A rather than throwing in formatPrice.
    expect((await screen.findAllByText("N/A")).length).toBeGreaterThanOrEqual(2);
  });

  it("renders rows with NULL minimum_stock_level and NULL generic/manufacturer", async () => {
    renderInventory();
    expect(await screen.findByText("Cetirizine")).toBeInTheDocument();
    expect(await screen.findByText("K12.50")).toBeInTheDocument();
  });

  it("renders the empty state when the institution has no stock", async () => {
    queryData = [];
    renderInventory();
    expect(
      await screen.findByText(/No medications in inventory/)
    ).toBeInTheDocument();
  });
});
