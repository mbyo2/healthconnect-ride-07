import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PushNotificationService } from '@/services/PushNotificationService';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('PushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should subscribe user to push notifications', async () => {
      const mockSubscription = {
        endpoint: 'https://example.com',
        keys: { p256dh: 'key1', auth: 'key2' },
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await PushNotificationService.subscribe(mockSubscription);
      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('push_subscriptions');
    });

    it('should return false if user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await PushNotificationService.subscribe({
        endpoint: 'https://example.com',
        keys: { p256dh: 'key1', auth: 'key2' },
      });
      expect(result).toBe(false);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe user from push notifications', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await PushNotificationService.unsubscribe();
      expect(result).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return true if user has active subscription', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await PushNotificationService.isEnabled();
      expect(result).toBe(true);
    });

    it('should return false if user has no subscription', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      } as any);

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockReturnValue(mockFrom as any);

      const result = await PushNotificationService.isEnabled();
      expect(result).toBe(false);
    });
  });

  describe('sendToUser', () => {
    it('should send notification to specific user', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await PushNotificationService.sendToUser('user-123', {
        title: 'Test',
        body: 'Test notification',
      });
      expect(result).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: {
          action: 'send_to_user',
          userId: 'user-123',
          payload: { title: 'Test', body: 'Test notification' },
        },
      });
    });
  });

  describe('sendToUsers', () => {
    it('should send notification to multiple users', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await PushNotificationService.sendToUsers(['user-1', 'user-2'], {
        title: 'Test',
        body: 'Test notification',
      });
      expect(result).toBe(true);
    });
  });

  describe('sendToRole', () => {
    it('should send notification to users with specific role', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await PushNotificationService.sendToRole('admin', {
        title: 'Test',
        body: 'Test notification',
      });
      expect(result).toBe(true);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-push-notification', {
        body: {
          action: 'send_to_role',
          role: 'admin',
          payload: { title: 'Test', body: 'Test notification' },
        },
      });
    });
  });
});
