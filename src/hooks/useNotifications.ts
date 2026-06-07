import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Unified notification dispatcher.
 * Picks SMS → Push → Email by user preference + connectivity.
 * All channels are best-effort and never throw to the caller.
 */

export type NotificationChannel = 'sms' | 'push' | 'email' | 'whatsapp';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  /** Optional preferred channels in priority order. Falls back to all. */
  channels?: NotificationChannel[];
  /** Categorizes the event for preferences + analytics */
  category?: 'appointment' | 'prescription' | 'lab' | 'payment' | 'security' | 'system';
  /** Optional deep-link path opened on click */
  link?: string;
  /** SMS/WhatsApp recipient if known (otherwise resolved server-side) */
  phone?: string;
  /** Email recipient if known */
  email?: string;
}

interface DispatchResult {
  channel: NotificationChannel;
  ok: boolean;
  error?: string;
}

async function tryInvoke(fn: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke(fn, { body });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function dispatchNotification(payload: NotificationPayload): Promise<DispatchResult[]> {
  const channels: NotificationChannel[] = payload.channels ?? ['push', 'sms', 'email'];
  const results: DispatchResult[] = [];

  // Always persist an in-app notification record first (cheap, sync, drives bell UI)
  try {
    await (supabase as any).from('notifications').insert({
      user_id: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.category || 'system',
      read: false,
      link: payload.link,
    });
  } catch {
    // notifications table may not exist on every env; ignore
  }

  for (const channel of channels) {
    let res: { ok: boolean; error?: string } = { ok: false, error: 'not attempted' };
    switch (channel) {
      case 'push':
        res = await tryInvoke('send-push', {
          userId: payload.userId,
          title: payload.title,
          body: payload.message,
          link: payload.link,
        });
        break;
      case 'sms':
        res = await tryInvoke('send-sms', {
          userId: payload.userId,
          phone: payload.phone,
          message: `${payload.title}: ${payload.message}`,
        });
        break;
      case 'email':
        res = await tryInvoke('send-email', {
          to: payload.email,
          userId: payload.userId,
          subject: payload.title,
          html: `<p>${payload.message}</p>`,
        });
        break;
      case 'whatsapp':
        res = await tryInvoke('whatsapp-dispatch', {
          userId: payload.userId,
          phone: payload.phone,
          message: `${payload.title}\n${payload.message}`,
        });
        break;
    }
    results.push({ channel, ...res });
    // Stop on first success unless caller explicitly listed multiple
    if (res.ok && payload.channels === undefined) break;
  }
  return results;
}

export function useNotifications() {
  const { user } = useAuth();

  const notify = useCallback(
    (payload: Omit<NotificationPayload, 'userId'> & { userId?: string }) => {
      const userId = payload.userId || user?.id;
      if (!userId) return Promise.resolve([] as DispatchResult[]);
      return dispatchNotification({ ...payload, userId });
    },
    [user?.id],
  );

  return { notify };
}
