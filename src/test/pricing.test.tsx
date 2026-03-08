/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Mock supabase - return empty array instead of undefined
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, profile: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the hooks directly to avoid supabase query issues
vi.mock('@/hooks/useSubscription', () => ({
  useSubscriptionPlans: () => ({ data: [], isLoading: false }),
  useUserSubscription: () => ({ data: null, isLoading: false }),
  useSubscribeToPlan: () => ({ mutate: vi.fn(), isPending: false }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

describe('PricingPage', () => {
  it('renders pricing page with tabs', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    expect(screen.getByText(/Patients/)).toBeInTheDocument();
    expect(screen.getByText(/Providers/)).toBeInTheDocument();
    expect(screen.getByText(/Pharmacies/)).toBeInTheDocument();
  });

  it('shows free section for patients', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText('Free to Use — Pay Only for Care')).toBeInTheDocument();
  });

  it('shows pharmacy tab', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Pharmacies/)).toBeInTheDocument();
  });

  it('displays pricing subtitle', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Free to browse for patients/)).toBeInTheDocument();
  });
});

describe('SubscriptionBadge', () => {
  it('renders nothing when no subscription', async () => {
    vi.doMock('@/hooks/useSubscription', () => ({
      useUserSubscription: () => ({ data: null, isLoading: false }),
      useSubscriptionPlans: () => ({ data: [], isLoading: false }),
      useSubscribeToPlan: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    const { SubscriptionBadge } = await import('@/components/subscription/SubscriptionBadge');
    const Wrapper = createWrapper();
    const { container } = render(<SubscriptionBadge />, { wrapper: Wrapper });
    expect(container.innerHTML).toBe('');
  });
});
