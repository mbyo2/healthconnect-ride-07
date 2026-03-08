import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock modules
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

vi.mock('@/hooks/use-currency', () => ({
  useCurrency: () => ({
    currency: 'ZMW',
    setCurrency: vi.fn(),
    formatPrice: (amount: number) => `K${amount}`,
    getSymbol: () => 'K',
    loading: false,
    detectedCountry: 'ZM',
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('PricingPage', () => {
  it('renders pricing page with tabs', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('Institutions')).toBeInTheDocument();
  });

  it('shows free messaging for patients', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText('Always Free for Patients')).toBeInTheDocument();
    expect(screen.getByText(/No hidden fees/)).toBeInTheDocument();
  });

  it('shows pharmacy commission-only section', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText('Pharmacies')).toBeInTheDocument();
    expect(screen.getByText(/commission-only model/)).toBeInTheDocument();
  });

  it('displays ZMW currency notice', async () => {
    const { PricingPage } = await import('@/components/subscription/PricingPage');
    const Wrapper = createWrapper();
    render(<PricingPage />, { wrapper: Wrapper });

    expect(screen.getByText(/Zambian Kwacha/)).toBeInTheDocument();
  });
});

describe('SubscriptionBadge', () => {
  it('renders nothing when no subscription', async () => {
    const { SubscriptionBadge } = await import('@/components/subscription/SubscriptionBadge');
    const Wrapper = createWrapper();
    const { container } = render(<SubscriptionBadge />, { wrapper: Wrapper });
    
    // Should render nothing for free/no subscription
    expect(container.innerHTML).toBe('');
  });
});
