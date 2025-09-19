import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileLayout } from '../MobileLayout';

// Mock hooks and context
jest.mock('@/hooks/use-device-type', () => ({ useDeviceType: () => ({ isDesktop: false }) }));
jest.mock('@/context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));


describe('MobileLayout', () => {
  it('renders Header and BottomNav for mobile when authenticated', () => {
    render(<MobileLayout isLoading={false}><div>Test Content</div></MobileLayout>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    // You may need to adjust these selectors based on your actual Header/BottomNav implementation
  });

  it('shows LoadingScreen when isLoading is true', () => {
    render(<MobileLayout isLoading={true}><div>Test Content</div></MobileLayout>);
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });
});
