import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Smartphone, Watch, Heart, Thermometer, Droplet, Zap, Settings, TrendingUp, AlertCircle, CheckCircle2, Battery, Bot, ArrowRight, Bluetooth, Usb, Cable, Wifi } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIoT } from '@/hooks/useIoT';
import { useAuth } from '@/hooks/useAuth';
import { IoTDevice } from '@/types/iot';
import { AIInsightsWidget } from '@/components/ai/AIInsightsWidget';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const IoTMonitoring = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { devices, vitalSigns, alerts, loading, addDevice, scanAndConnectDevice, isScanning } = useIoT(user?.id);
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

    // Helper to get icon for device type
    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'smartwatch': return Watch;
            case 'fitness_tracker': return Activity;
            case 'blood_pressure_monitor': return Heart;
            case 'thermometer': return Thermometer;
            default: return Smartphone;
        }
    };

    // Helper to get icon for connection type
    const getConnectionIcon = (type: string) => {
        switch (type) {
            case 'bluetooth': return Bluetooth;
            case 'usb': return Usb;
            case 'serial': return Cable;
            case 'wifi': return Wifi;
            default: return Zap;
        }
    };

    // Fetch historical heart rate data
    const { data: heartRateData } = useQuery({
        queryKey: ['heart-rate-history', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('vital_signs')
                .select('heart_rate, recorded_at')
                .eq('user_id', user?.id)
                .order('recorded_at', { ascending: true })
                .limit(24); // Last 24 readings

            if (!data) return [];

            return data.map(record => ({
                time: new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                value: record.heart_rate
            }));
        },
        enabled: !!user,
        initialData: []
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-background dark:via-blue-950/10 p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            <Activity className="w-10 h-10 text-primary" />
                            IoT Health Monitoring
                        </h1>
                        <p className="text-muted-foreground mt-1">Real-time data from your connected devices</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Device Settings
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="secondary"
                                    disabled={isScanning}
                                >
                                    {isScanning ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 mr-2" />
                                            Connect Device
                                        </>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => scanAndConnectDevice('bluetooth')}>
                                    <Bluetooth className="w-4 h-4 mr-2" />
                                    Bluetooth
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => scanAndConnectDevice('usb')}>
                                    <Usb className="w-4 h-4 mr-2" />
                                    USB (Cable)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => scanAndConnectDevice('serial')}>
                                    <Cable className="w-4 h-4 mr-2" />
                                    Serial (Legacy)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => scanAndConnectDevice('wifi')}>
                                    <Wifi className="w-4 h-4 mr-2" />
                                    Wi-Fi / Cloud
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                    </div>
                </div>

                {/* Connected Devices */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {devices.map((device) => {
                        const Icon = getDeviceIcon(device.device_type);
                        return (
                            <Card
                                key={device.id}
                                className={`cursor-pointer transition-all hover:shadow-lg ${selectedDevice === device.id ? 'border-blue-500 shadow-md' : ''
                                    }`}
                                onClick={() => setSelectedDevice(device.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex gap-2">
                                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800/30">
                                                {React.createElement(getConnectionIcon(device.connection_type), { className: "w-4 h-4 text-gray-600 dark:text-gray-400" })}
                                            </div>
                                        </div>
                                        <Badge variant={device.is_active ? 'default' : 'secondary'}>
                                            {device.is_active ? 'Connected' : 'Offline'}
                                        </Badge>
                                    </div>
                                    <h3 className="font-semibold mb-1">{device.device_name}</h3>
                                    <p className="text-sm text-muted-foreground mb-3">{device.device_type.replace('_', ' ')}</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Battery</span>
                                            <span className="font-medium">{device.battery_level}%</span>
                                        </div>
                                        <Progress value={device.battery_level || 0} className="h-2" />
                                        <p className="text-xs text-muted-foreground">Last sync: {device.last_sync ? new Date(device.last_sync).toLocaleTimeString() : 'Never'}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                    {devices.length === 0 && (
                        <div className="col-span-full text-center p-8 text-muted-foreground">
                            No devices connected. Click "Add Device" to get started.
                        </div>
                    )}
                </div>

                {/* Current Vital Signs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-destructive" />
                            Current Vital Signs
                        </CardTitle>
                        <CardDescription>Real-time health measurements from your devices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Heart className="w-5 h-5 text-destructive" />
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Heart Rate</p>
                                <p className="text-3xl font-bold mt-1">{vitalSigns?.heart_rate || '--'}</p>
                                <p className="text-xs text-muted-foreground">bpm</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                                <p className="text-3xl font-bold mt-1">
                                    {vitalSigns?.blood_pressure
                                        ? `${vitalSigns.blood_pressure.systolic}/${vitalSigns.blood_pressure.diastolic}`
                                        : '--/--'}
                                </p>
                                <p className="text-xs text-muted-foreground">mmHg</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Temperature</p>
                                <p className="text-3xl font-bold mt-1">{vitalSigns?.temperature || '--'}</p>
                                <p className="text-xs text-muted-foreground">°C</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Droplet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
                                <p className="text-3xl font-bold mt-1">{vitalSigns?.oxygen_saturation || '--'}</p>
                                <p className="text-xs text-muted-foreground">%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Heart Rate Trend */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Heart Rate Trend (24h)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={heartRateData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Alerts & Notifications */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className={`p-2 rounded-full ${alert.severity === 'low' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                        alert.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                        }`}>
                                        {alert.severity === 'low' ? (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{alert.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{new Date(alert.triggered_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                            {alerts.length === 0 && (
                                <div className="text-center text-muted-foreground py-4">
                                    No active alerts
                                </div>
                            )}
                            <Button variant="outline" className="w-full">View All Alerts</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* AI Insights Section */}
                <AIInsightsWidget
                    context="iot"
                    data={{
                        devices: devices.length,
                        vitalSigns,
                        alertCount: alerts.length
                    }}
                />

                {/* Device Pairing Guide */}
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Connect More Devices</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Pair your fitness trackers, smartwatches, and health monitors to get comprehensive health insights.
                                </p>
                                <div className="flex gap-3 mt-3">
                                    <Button variant="outline" onClick={() => navigate('/ai-diagnostics')}>
                                        <Bot className="w-4 h-4 mr-2" />
                                        AI Analysis
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default IoTMonitoring;
