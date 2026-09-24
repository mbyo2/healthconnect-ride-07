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
    });
  } catch {
    // notifications table may not exist on every env; ignore
  }

  // send-sms only accepts its template enum — map our category across.
  const smsType =
    payload.category === 'appointment' ? 'appointment'
    : payload.category === 'prescription' ? 'prescription'
    : 'general';

  for (const channel of channels) {
    let res: { ok: boolean; error?: string } = { ok: false, error: 'not attempted' };
    switch (channel) {
      case 'push':
        // send-push contract: { userId|userIds, title, body, url? }.
        res = await tryInvoke('send-push', {
          userIds: [payload.userId],
          title: payload.title,
          body: payload.message,
          url: payload.link || '/',
        });
        break;
      case 'sms':
        // send-sms contract: { phone, message, type, patientId? }. Simulated
        // until a live gateway is connected — the result reports it honestly.
        if (!payload.phone) {
          res = { ok: false, error: 'skipped: no recipient phone number' };
          break;
        }
        res = await tryInvoke('send-sms', {
          phone: payload.phone,
          message: `${payload.title}: ${payload.message}`.slice(0, 640),
          type: smsType,
          patientId: payload.userId,
        });
        break;
      case 'email':
        // send-email contract: { type, to[], data }. Generic content travels
        // as general_notice (staff/admin or self-send enforced server-side).
        if (!payload.email) {
          res = { ok: false, error: 'skipped: no recipient email address' };
          break;
        }
        res = await tryInvoke('send-email', {
          type: 'general_notice',
          to: [payload.email],
          data: { title: payload.title, message: payload.message },
        });
        break;
      case 'whatsapp':
        // No whatsapp-dispatch function is deployed — report honestly instead
        // of invoking a missing endpoint.
        res = { ok: false, error: 'skipped: WhatsApp channel is not connected' };
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
