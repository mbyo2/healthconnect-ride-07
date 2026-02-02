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

vi.mock('@/utils/storage', () => ({
  safeLocalSet: vi.fn(),
  safeLocalGet: vi.fn(),
  safeLocalRemove: vi.fn(),
}));

import { useMarketplace } from '@/hooks/useMarketplace';
import { safeLocalSet } from '@/utils/storage';

// Get the mocked function
const mockSafeLocalSet = vi.mocked(safeLocalSet);

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
    expect(mockSafeLocalSet).toHaveBeenCalled();

    // Cleanup
    unmount();
  });
});
