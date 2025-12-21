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

            // Fetch Health Metrics from comprehensive table (EAV structure)
            const { data: metrics, error: metricsError } = await supabase
                .from('comprehensive_health_metrics')
                .select('*')
                .eq('user_id', userId)
                .eq('metric_category', 'lifestyle')
                .gte('recorded_at', startDate.toISOString())
                .lte('recorded_at', endDate.toISOString())
                .order('recorded_at', { ascending: true });

            if (metricsError) throw metricsError;

            // Fetch Vital Signs (Heart Rate)
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
        // Pivot EAV data to grouped by date
        const groupedByDate: Record<string, any> = {};

        data.forEach(record => {
            const dateStr = new Date(record.recorded_at).toLocaleDateString('en-US', { weekday: 'short' });
            if (!groupedByDate[dateStr]) {
                groupedByDate[dateStr] = { date: dateStr };
            }

            // Map metric names to chart keys
            if (record.metric_name === 'steps') groupedByDate[dateStr].steps = Number(record.value);
            if (record.metric_name === 'calories_burned') groupedByDate[dateStr].calories = Number(record.value);
            if (record.metric_name === 'distance') groupedByDate[dateStr].distance = Number(record.value);
            if (record.metric_name === 'sleep_hours') groupedByDate[dateStr].sleep_hours = Number(record.value);
        });

        const processedData = Object.values(groupedByDate);

        // Transform for charts
        setActivityData(processedData.map(d => ({
            date: d.date,
            steps: d.steps || 0,
            calories: d.calories || 0,
            distance: d.distance || 0
        })));

        setSleepData(processedData.map(d => ({
            date: d.date,
            hours: d.sleep_hours || 0,
            // Mock breakdown as we only have total hours in schema
            deep: (d.sleep_hours || 0) * 0.2,
            light: (d.sleep_hours || 0) * 0.6,
            rem: (d.sleep_hours || 0) * 0.2
        })));
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
