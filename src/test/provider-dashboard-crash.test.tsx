/**
 * Regression: /provider-dashboard crashed for a verified provider
 * (QA wave doctor: 1 pending appointment, no provider_statistics row).
 * Renders ProviderMetricsDashboard (the Overview tab Stage A added)
 * with that exact data shape.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const QA_DOCTOR_ID = "7789a6fc-011f-4851-a7fd-d9c9a6709fbf";

vi.mock("@/integrations/supabase/client", () => {
  const today = new Date().toISOString().slice(0, 10);
  const makeChain = (list: any, single: any) => {
    const chain: any = {
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      lt: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => single,
      single: async () => single,
      then: (res: any, rej: any) => Promise.resolve(list).then(res, rej),
    };
    return chain;
  };
  const tables: Record<string, { list: any; single: any }> = {
    // QA doctor: exactly one pending appointment, nothing else.
    appointments: {
      list: {
        data: [{ id: "appt-1", status: "pending", date: today, created_at: new Date().toISOString() }],
        error: null,
      },
      single: { data: null, error: null },
    },
    // No statistics row for a new provider.
    provider_statistics: { list: { data: [], error: null }, single: { data: null, error: null } },
    // No wallet row yet.
    wallets: { list: { data: [], error: null }, single: { data: null, error: null } },
  };
  return {
    supabase: {
      from: (table: string) => ({
        select: () => makeChain(tables[table]?.list ?? { data: [], error: null }, tables[table]?.single ?? { data: null, error: null }),
      }),
      auth: { getUser: async () => ({ data: { user: { id: QA_DOCTOR_ID } }, error: null }) },
    },
  };
});

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: QA_DOCTOR_ID }, loading: false }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock("@/context/UserRolesContext", () => ({
  useUserRoles: () => ({ availableRoles: ["doctor"], currentRole: "doctor", isHealthPersonnel: true }),
  UserRolesProvider: ({ children }: any) => children,
}));

vi.mock("@/utils/storage", () => ({
  safeLocalSet: vi.fn(),
  safeLocalGet: vi.fn(() => null),
  safeLocalRemove: vi.fn(),
}));

vi.mock("@/services/exchangeRates", () => ({
  BASE_CURRENCY: "ZMW",
  fromZmw: (n: number) => n,
  toZmw: (n: number) => n,
  roundForCurrency: (n: number) => n,
  refreshRates: async () => {},
  ratesAreLive: () => false,
  ratesUpdatedAt: () => 0,
}));

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one.
// (Real browsers provide it — this is test-environment plumbing only.)
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || ResizeObserverStub;

import { ProviderMetricsDashboard } from "@/components/metrics/RoleMetricsDashboard";

describe("ProviderMetricsDashboard — new-provider data shape", () => {
  it("renders the metrics overview without throwing", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ProviderMetricsDashboard />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByText("Earnings")).toBeInTheDocument());
    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("Avg Rating")).toBeInTheDocument();
  });
});
