import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  source: string; // queue, triage, lab, billing, dispatch, system
  read: boolean;
  created_at: string;
  action_url?: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Build notifications from real-time channel events
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global_notifications')
      // Queue token changes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'queue_tokens' }, (payload) => {
        const data = payload.new as any;
        if (data.priority === 'emergency') {
          addNotification({
            title: 'Emergency Token',
            message: `Emergency patient ${data.patient_name} — Token ${data.token_number}`,
            type: 'critical',
            source: 'queue',
            action_url: '/receptionist',
          });
        }
      })
      // Triage assessments
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'triage_assessments' }, (payload) => {
        const data = payload.new as any;
        if (data.triage_level === 'critical') {
          addNotification({
            title: 'Critical Triage',
            message: `Critical patient: ${data.patient_name} — immediate attention required`,
            type: 'critical',
            source: 'triage',
            action_url: '/triage',
          });
        }
      })
      // Ambulance dispatches
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ambulance_dispatches' }, (payload) => {
        const data = payload.new as any;
        addNotification({
          title: 'New Dispatch',
          message: `${data.priority.toUpperCase()}: ${data.patient_name} — ${data.pickup_location} → ${data.destination}`,
          type: data.priority === 'emergency' ? 'critical' : 'warning',
          source: 'dispatch',
          action_url: '/ambulance',
        });
      })
      // Pathologist critical flags
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pathologist_reviews' }, (payload) => {
        const data = payload.new as any;
        if (data.is_critical && data.status === 'critical') {
          addNotification({
            title: 'Critical Lab Finding',
            message: `Critical result for ${data.patient_name} — ${data.test_name}`,
            type: 'critical',
            source: 'lab',
          });
        }
      })
      // Work orders - critical
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'work_orders' }, (payload) => {
        const data = payload.new as any;
        if (data.priority === 'critical') {
          addNotification({
            title: 'Critical Work Order',
            message: `${data.title} at ${data.location || 'unknown location'}`,
            type: 'warning',
            source: 'maintenance',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'created_at'>) => {
    const notification: AppNotification = {
      ...n,
      id: crypto.randomUUID?.() || Date.now().toString(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 100));
    setUnreadCount(prev => prev + 1);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, clearAll, addNotification };
}
