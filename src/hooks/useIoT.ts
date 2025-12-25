import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IoTDevice, VitalSigns, DeviceAlert, BloodPressure } from '@/types/iot';
import { toast } from 'sonner';
import { bluetoothService } from '@/services/iot/bluetooth-service';
import { usbService } from '@/services/iot/usb-service';
import { serialService } from '@/services/iot/serial-service';
import { wifiService } from '@/services/iot/wifi-service';
import { ConnectionType } from '@/types/iot';

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
  const [isScanning, setIsScanning] = useState(false);

  // Refs for cleanup
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribed = useRef(false);

  // Throttled fetch functions to prevent excessive database calls
  const fetchDevices = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('iot_devices' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data as any as IoTDevice[]);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  }, [userId]);

  const fetchLatestVitalSigns = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('vital_signs' as any)
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setVitalSigns(data as any as VitalSigns);
    } catch (error) {
      console.error('Error fetching vital signs:', error);
    }
  }, [userId]);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('device_alerts' as any)
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
        .from('iot_devices' as any)
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

  const scanAndConnectDevice = useCallback(async (type: ConnectionType = 'bluetooth') => {
    if (!userId) return;

    setIsScanning(true);
    try {
      let deviceData: any;
      let connectionId: string;
      let deviceName: string;

      if (type === 'bluetooth') {
        if (!bluetoothService.isSupported()) {
          toast.error('Bluetooth is not supported on this device');
          return;
        }
        const device = await bluetoothService.scanForDevices();
        toast.loading(`Connecting to ${device.name || 'Bluetooth Device'}...`);
        await bluetoothService.connect(device);
        connectionId = device.id;
        deviceName = device.name || 'Unknown Bluetooth Device';

        // Start listening for HR
        await bluetoothService.startHeartRateNotifications(async (hr) => {
          await persistVitalSigns(hr, connectionId);
        });
      } else if (type === 'usb') {
        if (!usbService.isSupported()) {
          toast.error('Web USB is not supported on this device');
          return;
        }
        const device = await usbService.scanForDevices();
        toast.loading(`Connecting to ${device.productName || 'USB Device'}...`);
        await usbService.connect(device);
        connectionId = device.serialNumber || `USB-${Date.now()}`;
        deviceName = device.productName || 'Unknown USB Device';

        await usbService.startDataStream(async (data) => {
          // Generic parser for USB data - in real app, this would be device-specific
          const hr = data.getUint8(0);
          await persistVitalSigns(hr, connectionId);
        });
      } else if (type === 'serial') {
        if (!serialService.isSupported()) {
          toast.error('Web Serial is not supported on this device');
          return;
        }
        const port = await serialService.scanForDevices();
        toast.loading(`Connecting to Serial Port...`);
        await serialService.connect(port);
        connectionId = `SERIAL-${Date.now()}`;
        deviceName = 'Serial Device';

        await serialService.startDataStream(async (data) => {
          // Generic parser for Serial data
          const hr = data[0];
          await persistVitalSigns(hr, connectionId);
        });
      } else {
        toast.error(`Connection type ${type} not yet implemented for scanning`);
        return;
      }

      toast.dismiss();
      toast.success(`Connected to ${deviceName}`);

      // Register device in DB
      await addDevice({
        device_name: deviceName,
        device_type: 'smartwatch',
        connection_type: type,
        device_id: connectionId,
        is_active: true,
        battery_level: 100
      });

    } catch (error: any) {
      console.error('[useIoT] Scanning error:', error);
      handleConnectionError(error);
    } finally {
      setIsScanning(false);
      toast.dismiss();
    }
  }, [userId, addDevice]);

  const persistVitalSigns = async (hr: number, deviceId: string) => {
    if (!userId) return;

    // Update local state immediately
    setVitalSigns(prev => ({
      ...prev!,
      heart_rate: hr,
      recorded_at: new Date().toISOString()
    }));

    // Persist to DB
    await supabase.from('vital_signs' as any).insert({
      user_id: userId,
      heart_rate: hr,
      device_id: deviceId,
      recorded_at: new Date().toISOString()
    });
  };

  const handleConnectionError = (error: any) => {
    if (error.name === 'NotFoundError') {
      toast.info('Scanning cancelled or no device selected');
    } else if (error.name === 'SecurityError') {
      toast.error('Security error. Please ensure the site is served over HTTPS.');
    } else if (error.name === 'NotAllowedError') {
      toast.error('Permission denied by user or browser.');
    } else if (error.name === 'NotSupportedError') {
      toast.error('Protocol is not supported or disabled on this device.');
    } else {
      toast.error(`Failed to connect: ${error.message || 'Unknown error'}`);
    }
  };

  const removeDevice = useCallback(async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('iot_devices' as any)
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
        .from('device_alerts' as any)
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
    isScanning,
    addDevice,
    scanAndConnectDevice,
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
