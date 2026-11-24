/**
 * UI pin for the 2026-11-24 CEO report ("Pharmacy items I don't know
 * how they are added… I am only seeing receive batch"): the Batch
 * inventory surface must offer a first-class "Add item" action, and
 * the Receive batch dialog must offer inline "Create new item" —
 * including an honest empty-catalogue state — instead of a dead-end
 * item dropdown.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Universal supabase chain: every read returns an empty catalogue,
// every write succeeds.
function makeChain() {
  const result = Promise.resolve({ data: [], error: null });
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    in: () => chain,
    or: () => chain,
    lt: () => chain,
    lte: () => chain,
    gte: () => chain,
    neq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: { id: "new-id" }, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      result.then(onFulfilled, onRejected),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => makeChain(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "qa" } } }) },
  },
}));

vi.mock("@/hooks/useInstitutionContext", () => ({
  useInstitutionContext: () => ({
    institution: { id: "456c9955-1add-4a05-a4b6-4b0c54029ee7", name: "QA Clinic" },
    institutionId: "456c9955-1add-4a05-a4b6-4b0c54029ee7",
    loading: false,
  }),
}));

vi.mock("@/hooks/use-currency", () => ({
  useCurrency: () => ({ formatPrice: (n: number) => `K${Number(n).toFixed(2)}` }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { BatchInventory } from "@/components/pharmacy/BatchInventory";

function renderSurface() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BatchInventory />
    </QueryClientProvider>
  );
}

describe("BatchInventory — item creation is discoverable", () => {
  // Render-heavy surface: generous timeouts for the shared 1.5-CPU box
  // (the default 5s is marginal for a cold jsdom render of this page).
  it("shows both Add item and Receive batch actions in the header", async () => {
    renderSurface();
    expect(await screen.findByRole("button", { name: /add item/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receive batch/i })).toBeInTheDocument();
  }, 30000);

  it("receive dialog offers inline item creation and names the empty catalogue", async () => {
    renderSurface();
    fireEvent.click(await screen.findByRole("button", { name: /receive batch/i }));

    expect(await screen.findByText(/no items in the catalogue yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create new item/i }));

    await waitFor(() => {
      expect(screen.getByText(/add a new medicine or stock item/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/catalogue/i)).toBeInTheDocument();
  }, 30000);

  it("standalone Add item opens the same create dialog", async () => {
    renderSurface();
    fireEvent.click(await screen.findByRole("button", { name: /add item/i }));
    await waitFor(() => {
      expect(screen.getByText(/add a new medicine or stock item/i)).toBeInTheDocument();
    });
  }, 30000);
});
