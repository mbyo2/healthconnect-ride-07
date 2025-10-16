import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';

// Mocks
vi.mock('@/integrations/supabase/client', () => {
  const chainFactory = () => {
    const chain: any = {
      eq: () => chain,
      order: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      limit: async () => ({ data: [], error: null }),
      select: () => chain,
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      from: (_: string) => ({ select: chainFactory }),
      functions: { invoke: async () => ({ data: { success: true }, error: null }) },
      auth: { signInWithPassword: async () => ({ data: null, error: null }) }
    }
  };
});

const mockLocal: Record<string, string> = {};
const safeLocalSet = vi.fn((k: string, v: string) => { mockLocal[k] = v; });
const safeLocalGet = vi.fn((k: string) => mockLocal[k] ?? null);
const safeLocalRemove = vi.fn((k: string) => { delete mockLocal[k]; });

vi.mock('@/utils/storage', () => ({
  safeLocalSet,
  safeLocalGet,
  safeLocalRemove,
}));

// Import hook after mocks
import { useMarketplace } from '@/hooks/useMarketplace';

function HookTester() {
  const m = useMarketplace();
  useEffect(() => {
    // expose for tests
    // @ts-ignore
    window.__market = m;
  }, [m]);
  return null;
}

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('marketplace smoke', () => {
  it('adds item to cart and persists', async () => {
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <HookTester />
      </QueryClientProvider>
    );

    // Wait a tick for hooks to initialize
    await act(async () => Promise.resolve());

    // @ts-ignore
    const market = (window as any).__market;
    expect(market).toBeDefined();

    const product = {
      id: 'p1',
      medication_name: 'TestMed',
      price: 10,
      requires_prescription: false,
      dosage: '10mg',
      stock_quantity: 5,
      pharmacy: { id: 'ph1', name: 'Pharmacy 1' },
      category: 'General'
    };

    await act(async () => {
      market.addToCart(product, 2);
    });

    // @ts-ignore
    expect((window as any).__market.cart.items.length).toBe(1);
    expect(safeLocalSet).toHaveBeenCalled();
    expect(mockLocal['hc_cart_v1']).toBeTruthy();

    // Cleanup
    unmount();
  });
});
