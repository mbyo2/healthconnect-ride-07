import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Smartphone, Watch, Heart, Thermometer, Droplet, Zap, Plus, Settings, TrendingUp, AlertCircle, CheckCircle2, Battery } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useIoT } from '@/hooks/useIoT';
import { useAuth } from '@/hooks/useAuth'; // Assuming this exists, or we get user from context
import { IoTDevice } from '@/types/iot';

const IoTMonitoring = () => {
    const { user } = useAuth();
    const { devices, vitalSigns, alerts, loading, addDevice } = useIoT(user?.id);
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

    // Mock trend data for chart (since we only fetch latest vital sign in hook for now)
    // In a full implementation, we'd fetch history
    const heartRateData = [
        { time: '00:00', value: 68 },
        { time: '04:00', value: 65 },
        { time: '08:00', value: 75 },
        { time: '12:00', value: 82 },
        { time: '16:00', value: 78 },
        { time: '20:00', value: 72 },
        { time: '24:00', value: 70 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            <Activity className="w-10 h-10 text-blue-600" />
                            IoT Health Monitoring
                        </h1>
                        <p className="text-muted-foreground mt-1">Real-time data from your connected devices</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Device Settings
                        </Button>
                        <Button onClick={() => addDevice({
                            device_name: 'New Device',
                            device_type: 'fitness_tracker',
                            device_id: `DEV-${Date.now()}`,
                            is_active: true,
                            battery_level: 100
                        })}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Device
                        </Button>
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
                                        <div className="p-3 rounded-full bg-blue-50">
                                            <Icon className="w-6 h-6 text-blue-600" />
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
                            <Heart className="w-5 h-5 text-red-500" />
                            Current Vital Signs
                        </CardTitle>
                        <CardDescription>Real-time health measurements from your devices</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Heart className="w-5 h-5 text-red-500" />
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Heart Rate</p>
                                <p className="text-3xl font-bold mt-1">{vitalSigns?.heart_rate || '--'}</p>
                                <p className="text-xs text-muted-foreground">bpm</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Activity className="w-5 h-5 text-blue-500" />
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Blood Pressure</p>
                                <p className="text-3xl font-bold mt-1">
                                    {vitalSigns && 'bloodPressure' in vitalSigns && typeof vitalSigns.bloodPressure === 'string'
                                        ? vitalSigns.bloodPressure
                                        : '--/--'}
                                </p>
                                <p className="text-xs text-muted-foreground">mmHg</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Thermometer className="w-5 h-5 text-orange-500" />
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                        Normal
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">Temperature</p>
                                <p className="text-3xl font-bold mt-1">{vitalSigns?.temperature || '--'}</p>
                                <p className="text-xs text-muted-foreground">°C</p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <Droplet className="w-5 h-5 text-cyan-500" />
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
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
                                    <div className={`p-2 rounded-full ${alert.severity === 'low' ? 'bg-blue-50' :
                                        alert.severity === 'medium' ? 'bg-yellow-50' : 'bg-red-50'
                                        }`}>
                                        {alert.severity === 'low' ? (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-yellow-600" />
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

                {/* Device Pairing Guide */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-100">
                                <Smartphone className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Connect More Devices</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Pair your fitness trackers, smartwatches, and health monitors to get comprehensive health insights.
                                </p>
                                <Button className="mt-3">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Pair New Device
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default IoTMonitoring;
