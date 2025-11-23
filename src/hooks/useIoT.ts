import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IoTDevice, VitalSigns, DeviceAlert } from '@/types/iot';
import { toast } from 'sonner';

export function useIoT(userId: string | undefined) {
    const [devices, setDevices] = useState<IoTDevice[]>([]);
    const [vitalSigns, setVitalSigns] = useState<VitalSigns | null>(null);
    const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        fetchDevices();
        fetchLatestVitalSigns();
        fetchAlerts();

        // Subscribe to changes
        const devicesSubscription = supabase
            .channel('iot_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_devices', filter: `user_id=eq.${userId}` },
                () => fetchDevices())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vital_signs', filter: `user_id=eq.${userId}` },
                (payload) => setVitalSigns(payload.new as VitalSigns))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'device_alerts' },
                (payload) => {
                    // We can't filter by user_id directly on alerts as it's on the device, 
                    // but we can re-fetch or check if the device belongs to user.
                    // For simplicity, just re-fetch alerts.
                    fetchAlerts();
                    toast.warning(`New Device Alert: ${(payload.new as DeviceAlert).message}`);
                })
            .subscribe();

        return () => {
            devicesSubscription.unsubscribe();
        };
    }, [userId]);

    const fetchDevices = async () => {
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
    };

    const fetchLatestVitalSigns = async () => {
        try {
            const { data, error } = await supabase
                .from('vital_signs')
                .select('*')
                .eq('user_id', userId)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found
            if (data) setVitalSigns(data as VitalSigns);
        } catch (error) {
            console.error('Error fetching vital signs:', error);
        }
    };

    const fetchAlerts = async () => {
        try {
            // Join with iot_devices to filter by user_id
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
    };

    const addDevice = async (device: Omit<IoTDevice, 'id' | 'created_at' | 'user_id'>) => {
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
            fetchDevices();
        } catch (error) {
            console.error('Error adding device:', error);
            toast.error('Failed to add device');
        }
    };

    return {
        devices,
        vitalSigns,
        alerts,
        loading,
        addDevice,
        refresh: () => {
            fetchDevices();
            fetchLatestVitalSigns();
            fetchAlerts();
        }
    };
}
