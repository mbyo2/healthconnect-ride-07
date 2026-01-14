import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Activity, Heart, TrendingUp, Users, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useHealthData } from '@/hooks/useHealthData';

const AdvancedDashboard = () => {
    const { profile, user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [appointmentCount, setAppointmentCount] = useState(0);
    const [providerCount, setProviderCount] = useState(0);
    const [healthScore, setHealthScore] = useState(0);
    const [activeDays, setActiveDays] = useState(0);
    const [stepsToday, setStepsToday] = useState(0);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch health data using the existing hook
    const { vitalsData } = useHealthData(user?.id, '7days');

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            // Fetch upcoming appointments
            const { data: appts, error: apptsError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    appointment_date,
                    appointment_time,
                    status,
                    provider:provider_id (
                        id,
                        first_name,
                        last_name,
                        specialization
                    )
                `)
                .eq('patient_id', user.id)
                .gte('appointment_date', new Date().toISOString().split('T')[0])
                .order('appointment_date', { ascending: true })
                .limit(2);

            if (!apptsError && appts) {
                setAppointments(appts);
            }

            // Get total appointment count
            const { count: totalAppts } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .eq('patient_id', user.id);

            setAppointmentCount(totalAppts || 0);

            // Get unique provider count
            const { data: uniqueProviders } = await supabase
                .from('appointments')
                .select('provider_id')
                .eq('patient_id', user.id);

            const uniqueCount = new Set(uniqueProviders?.map(p => p.provider_id)).size;
            setProviderCount(uniqueCount);

            // Calculate Active Days (days with health metrics in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: metricsData } = await supabase
                .from('comprehensive_health_metrics')
                .select('recorded_at')
                .eq('user_id', user.id)
                .gte('recorded_at', thirtyDaysAgo.toISOString());

            const uniqueDays = new Set(
                metricsData?.map(m => new Date(m.recorded_at).toDateString())
            );
            setActiveDays(uniqueDays.size);

            // Get steps for today
            const today = new Date().toISOString().split('T')[0];
            const { data: stepsData } = await supabase
                .from('comprehensive_health_metrics')
                .select('value')
                .eq('user_id', user.id)
                .eq('metric_name', 'steps')
                .gte('recorded_at', today)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            setStepsToday(stepsData?.value ? parseInt(String(stepsData.value)) : 0);

            // Fetch recent activity from user_events
            const { data: events } = await supabase
                .from('user_events')
                .select('event_type, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3);

            if (events && events.length > 0) {
                const activityMap: Record<string, { action: string; icon: any }> = {
                    'profile_updated': { action: 'Updated profile', icon: CheckCircle2 },
                    'appointment_booked': { action: 'Booked appointment', icon: Calendar },
                    'feature_used': { action: 'Used health feature', icon: Activity },
                    'form_submit': { action: 'Submitted health data', icon: Activity },
                };

                const formattedActivity = events.map((event, idx) => ({
                    id: idx + 1,
                    action: activityMap[event.event_type]?.action || 'Activity logged',
                    time: formatTimeAgo(new Date(event.created_at)),
                    icon: activityMap[event.event_type]?.icon || Activity
                }));

                setRecentActivity(formattedActivity);
            } else {
                // Fallback to default activities if no events
                setRecentActivity([
                    { id: 1, action: 'Welcome to HealthConnect', time: 'Just now', icon: Activity },
                ]);
            }

            // Calculate Health Score (0-100) based on available metrics
            const { data: vitals } = await supabase
                .from('vital_signs')
                .select('*')
                .eq('user_id', user.id)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            let score = 50; // Base score

            if (vitals) {
                // Blood pressure score (max 20 points)
                if (vitals.blood_pressure_systolic && vitals.blood_pressure_diastolic) {
                    const sys = vitals.blood_pressure_systolic;
                    const dia = vitals.blood_pressure_diastolic;
                    if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) score += 20;
                    else if (sys >= 80 && sys <= 140 && dia >= 50 && dia <= 90) score += 10;
                }

                // Heart rate score (max 15 points)
                if (vitals.heart_rate) {
                    if (vitals.heart_rate >= 60 && vitals.heart_rate <= 100) score += 15;
                    else if (vitals.heart_rate >= 50 && vitals.heart_rate <= 110) score += 8;
                }

                // Oxygen saturation score (max 15 points)
                if (vitals.oxygen_saturation) {
                    if (vitals.oxygen_saturation >= 95) score += 15;
                    else if (vitals.oxygen_saturation >= 90) score += 8;
                }
            }

            setHealthScore(Math.min(100, score));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to format time ago
    const formatTimeAgo = (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return date.toLocaleDateString();
    };

    const quickStats = [
        { label: 'Appointments', value: appointmentCount.toString(), icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
        { label: 'Health Score', value: `${healthScore}%`, icon: Heart, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/20' },
        { label: 'Active Days', value: activeDays.toString(), icon: Activity, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/20' },
        { label: 'Providers', value: providerCount.toString(), icon: Users, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/20' },
    ];

    const upcomingAppointments = appointments.map(apt => ({
        id: apt.id,
        doctor: apt.provider ? `Dr. ${apt.provider.first_name} ${apt.provider.last_name}` : 'Unknown Provider',
        specialty: apt.provider?.specialization || 'General',
        date: new Date(apt.appointment_date).toLocaleDateString(),
        time: apt.appointment_time || 'TBD',
        status: apt.status || 'pending'
    }));

    // recentActivity is now set from fetchDashboardData

    const healthMetrics = [
        { label: 'Heart Rate', value: vitalsData.restingHeartRate, trend: '+2%', status: 'normal' },
        { label: 'Blood Pressure', value: vitalsData.bloodPressure, trend: '-3%', status: 'normal' },
        { label: 'Weight', value: vitalsData.weight, trend: '-1%', status: 'improving' },
        { label: 'Steps Today', value: stepsToday.toLocaleString(), trend: '+15%', status: 'good' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            Welcome back, {profile?.first_name || 'User'}! 👋
                        </h1>
                        <p className="text-muted-foreground mt-1">Here's your health overview for today</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <Button asChild variant="outline" className="w-full sm:w-auto">
                            <Link to="/appointments">View All Appointments</Link>
                        </Button>
                        <Button asChild className="w-full sm:w-auto">
                            <Link to="/emergency">Emergency</Link>
                        </Button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickStats.map((stat, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                        <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Appointments */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Upcoming Appointments
                            </CardTitle>
                            <CardDescription>Your scheduled healthcare visits</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {upcomingAppointments.map((apt) => (
                                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-accent transition-colors gap-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{apt.doctor}</h4>
                                        <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                                        <p className="text-sm mt-1">{apt.date} at {apt.time}</p>
                                    </div>
                                    <div className="flex items-center gap-3 self-start sm:self-auto">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'confirmed' ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300'
                                            }`}>
                                            {apt.status}
                                        </span>
                                        <Button variant="outline" size="sm">View</Button>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full" asChild>
                                <Link to="/appointments">View All Appointments →</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3">
                                    <div className="p-2 rounded-full bg-primary/10">
                                        <activity.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{activity.action}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Health Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Health Metrics
                        </CardTitle>
                        <CardDescription>Your latest health measurements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {healthMetrics.map((metric, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                                    <p className="text-2xl font-bold mt-1">{metric.value}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-sm font-medium ${metric.status === 'normal' || metric.status === 'good' || metric.status === 'improving'
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {metric.trend}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{metric.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-center">
                            <Button asChild variant="outline">
                                <Link to="/health-analytics">View Detailed Analytics →</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common tasks and features</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                                <Link to="/symptoms">
                                    <Heart className="w-6 h-6" />
                                    <span className="text-sm">Log Symptoms</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                                <Link to="/iot-monitoring">
                                    <Activity className="w-6 h-6" />
                                    <span className="text-sm">IoT Devices</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                                <Link to="/medical-records">
                                    <Clock className="w-6 h-6" />
                                    <span className="text-sm">Medical Records</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                                <Link to="/chat">
                                    <Users className="w-6 h-6" />
                                    <span className="text-sm">Messages</span>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdvancedDashboard;
