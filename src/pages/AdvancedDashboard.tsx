import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Activity, Heart, TrendingUp, Users, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const AdvancedDashboard = () => {
    const { profile } = useAuth();

    const quickStats = [
        { label: 'Appointments', value: '3', icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/20' },
        { label: 'Health Score', value: '85%', icon: Heart, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/20' },
        { label: 'Active Days', value: '12', icon: Activity, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/20' },
        { label: 'Providers', value: '5', icon: Users, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/20' },
    ];

    const upcomingAppointments = [
        { id: 1, doctor: 'Dr. Sarah Johnson', specialty: 'Cardiologist', date: '2025-11-25', time: '10:00 AM', status: 'confirmed' },
        { id: 2, doctor: 'Dr. Michael Chen', specialty: 'General Practitioner', date: '2025-11-28', time: '2:30 PM', status: 'pending' },
    ];

    const recentActivity = [
        { id: 1, action: 'Logged vital signs', time: '2 hours ago', icon: Activity },
        { id: 2, action: 'Completed health assessment', time: '1 day ago', icon: CheckCircle2 },
        { id: 3, action: 'Prescription refilled', time: '3 days ago', icon: Clock },
    ];

    const healthMetrics = [
        { label: 'Heart Rate', value: '72 bpm', trend: '+2%', status: 'normal' },
        { label: 'Blood Pressure', value: '120/80', trend: '-3%', status: 'normal' },
        { label: 'Weight', value: '70 kg', trend: '-1%', status: 'improving' },
        { label: 'Steps Today', value: '8,542', trend: '+15%', status: 'good' },
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
