import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IoTDevice, VitalSigns, DeviceAlert, BloodPressure } from '@/types/iot';
import { toast } from 'sonner';

// Throttle function to prevent excessive updates
const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

export function useIoT(userId: string | undefined) {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  
  // Refs for cleanup
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribed = useRef(false);

  // Throttled fetch functions to prevent excessive database calls
  const fetchDevices = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('iot_devices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data as IoTDevice[]);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, [userId]);

  const fetchLatestVitalSigns = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setVitalSigns(data as VitalSigns);
    } catch (error) {
      console.error('Error fetching vital signs:', error);
    }
  }, [userId]);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('device_alerts')
        .select(`
          *,
          device:iot_devices!inner(user_id)
        `)
        .eq('device.user_id', userId)
        .order('triggered_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data as unknown as DeviceAlert[]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Throttled update handlers for real-time (300ms throttle)
  const throttledFetchDevices = useCallback(throttle(fetchDevices, 300), [fetchDevices]);
  const throttledFetchAlerts = useCallback(throttle(fetchAlerts, 300), [fetchAlerts]);

  // Initialize data and subscriptions
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial data fetch
    const initData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDevices(),
        fetchLatestVitalSigns(),
        fetchAlerts()
      ]);
      setLoading(false);
    };

    initData();

    // Setup real-time subscription
    if (!isSubscribed.current) {
      const channel = supabase
        .channel(`iot_realtime_${userId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'iot_devices', filter: `user_id=eq.${userId}` },
          () => throttledFetchDevices()
        )
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'vital_signs', filter: `user_id=eq.${userId}` },
          (payload) => {
            // Optimistic update - directly set the new vital signs
            setVitalSigns(payload.new as VitalSigns);
          }
        )
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'device_alerts' },
          (payload) => {
            throttledFetchAlerts();
            const alert = payload.new as DeviceAlert;
            
            // Show notification based on severity
            if (alert.severity === 'critical' || alert.severity === 'high') {
              toast.error(`Alert: ${alert.message}`, { duration: 10000 });
            } else {
              toast.warning(`Device Alert: ${alert.message}`, { duration: 5000 });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            isSubscribed.current = true;
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('reconnecting');
          }
        });

      subscriptionRef.current = channel;
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribed.current = false;
      }
    };
  }, [userId, fetchDevices, fetchLatestVitalSigns, fetchAlerts, throttledFetchDevices, throttledFetchAlerts]);

  const addDevice = useCallback(async (device: Omit<IoTDevice, 'id' | 'created_at' | 'user_id'>) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('iot_devices')
        .insert({
          ...device,
          user_id: userId
        });

      if (error) throw error;
      toast.success('Device added successfully');
      await fetchDevices();
    } catch (error) {
      console.error('Error adding device:', error);
      toast.error('Failed to add device');
    }
  }, [userId, fetchDevices]);

  const removeDevice = useCallback(async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('iot_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      toast.success('Device removed');
      await fetchDevices();
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    }
  }, [fetchDevices]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('device_alerts')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  }, [fetchAlerts]);

  // Helper to format blood pressure for display
  const formatBloodPressure = useCallback((bp: BloodPressure | string | undefined): string => {
    if (!bp) return '--/--';
    if (typeof bp === 'string') return bp;
    return `${bp.systolic}/${bp.diastolic}`;
  }, []);

  return {
    devices,
    vitalSigns,
    alerts,
    loading,
    connectionStatus,
    addDevice,
    removeDevice,
    acknowledgeAlert,
    formatBloodPressure,
    refresh: useCallback(() => {
      fetchDevices();
      fetchLatestVitalSigns();
      fetchAlerts();
    }, [fetchDevices, fetchLatestVitalSigns, fetchAlerts])
  };
}
