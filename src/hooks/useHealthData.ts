import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HealthMetrics, VitalSigns } from '@/types/iot';

export function useHealthData(userId: string | undefined, timeRange: string) {
    const [heartRateData, setHeartRateData] = useState<any[]>([]);
    const [activityData, setActivityData] = useState<any[]>([]);
    const [sleepData, setSleepData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        fetchData();
    }, [userId, timeRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endDate = new Date();
            let startDate = new Date();

            switch (timeRange) {
                case '7days': startDate.setDate(endDate.getDate() - 7); break;
                case '30days': startDate.setDate(endDate.getDate() - 30); break;
                case '90days': startDate.setDate(endDate.getDate() - 90); break;
                case '1year': startDate.setFullYear(endDate.getFullYear() - 1); break;
                default: startDate.setDate(endDate.getDate() - 7);
            }

            // Fetch Health Metrics (Activity, Sleep)
            const { data: metrics, error: metricsError } = await supabase
                .from('daily_health_metrics')
                .select('*')
                .eq('user_id', userId)
                .gte('date', startDate.toISOString().split('T')[0])
                .lte('date', endDate.toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (metricsError) throw metricsError;

            // Fetch Vital Signs (Heart Rate)
            // Note: This might be heavy if there are many readings. 
            // In a real app, we'd use a database function to aggregate.
            // For now, we'll fetch and aggregate in JS.
            const { data: vitals, error: vitalsError } = await supabase
                .from('vital_signs')
                .select('heart_rate, recorded_at')
                .eq('user_id', userId)
                .gte('recorded_at', startDate.toISOString())
                .lte('recorded_at', endDate.toISOString())
                .order('recorded_at', { ascending: true });

            if (vitalsError) throw vitalsError;

            processMetrics(metrics || []);
            processVitals(vitals || []);

        } catch (error) {
            console.error('Error fetching health data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processMetrics = (data: any[]) => {
        // Transform for charts
        const activity = data.map(d => ({
            date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
            steps: d.steps,
            calories: d.calories_burned,
            distance: d.distance
        }));
        setActivityData(activity);

        const sleep = data.map(d => ({
            date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
            hours: d.sleep_hours,
            // Mock breakdown as we only have total hours in schema
            deep: d.sleep_hours * 0.2,
            light: d.sleep_hours * 0.6,
            rem: d.sleep_hours * 0.2
        }));
        setSleepData(sleep);
    };

    const processVitals = (data: any[]) => {
        // Group by day and calculate min/max/avg
        const grouped: Record<string, number[]> = {};

        data.forEach(d => {
            const date = new Date(d.recorded_at).toLocaleDateString('en-US', { weekday: 'short' });
            if (!grouped[date]) grouped[date] = [];
            if (d.heart_rate) grouped[date].push(d.heart_rate);
        });

        const chartData = Object.entries(grouped).map(([date, values]) => ({
            date,
            avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
            min: Math.min(...values),
            max: Math.max(...values)
        }));

        setHeartRateData(chartData);
    };

    return {
        heartRateData,
        activityData,
        sleepData,
        loading
    };
}
