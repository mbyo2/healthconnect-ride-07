import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Zap, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle,
  Plus,
  Settings,
  TrendingUp,
  Battery,
  Smartphone,
  Watch,
  Monitor
} from 'lucide-react';
import { iotHealthMonitoring } from '@/utils/iot-health-monitoring';

interface IoTHealthMonitoringProps {
  patientId: string;
}

interface IoTDevice {
  id: string;
  patientId: string;
  deviceType: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  batteryLevel?: number;
  lastSync: string;
  metrics: string[];
}

interface HealthMetric {
  id: string;
  deviceId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  quality: 'good' | 'fair' | 'poor';
}

interface HealthAlert {
  id: string;
  deviceId: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export const IoTHealthMonitoring: React.FC<IoTHealthMonitoringProps> = ({ patientId }) => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [newDeviceType, setNewDeviceType] = useState('heart_rate_monitor');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [realTimeData, setRealTimeData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadIoTData();
    startRealTimeMonitoring();
    
    return () => {
      stopRealTimeMonitoring();
    };
  }, [patientId]);

  const loadIoTData = async () => {
    try {
      setLoading(true);

      // Load connected devices
      const connectedDevices = await iotHealthMonitoring.getConnectedDevices(patientId);
      setDevices(connectedDevices || []);

      // Load recent metrics
      const recentMetrics = await iotHealthMonitoring.getRecentMetrics(patientId, 24); // Last 24 hours
      setMetrics(recentMetrics || []);

      // Load active alerts
      const activeAlerts = await iotHealthMonitoring.getActiveAlerts(patientId);
      setAlerts(activeAlerts || []);

    } catch (error) {
      console.error('Failed to load IoT data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRealTimeMonitoring = () => {
    // Simulate real-time data updates
    const interval = setInterval(async () => {
      try {
        // Generate simulated real-time data for active devices
        const activeDevices = devices.filter(d => d.status === 'active');
        const newRealTimeData: Record<string, any> = {};

        for (const device of activeDevices) {
          newRealTimeData[device.id] = generateSimulatedData(device.deviceType);
        }

        setRealTimeData(newRealTimeData);

        // Check for new alerts
        await loadIoTData();
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  };

  const stopRealTimeMonitoring = () => {
    // Cleanup function called on unmount
  };

  const generateSimulatedData = (deviceType: string) => {
    switch (deviceType) {
      case 'heart_rate_monitor':
        return {
          heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 BPM
          timestamp: new Date().toISOString()
        };
      case 'blood_pressure_monitor':
        return {
          systolic: Math.floor(Math.random() * 40) + 110, // 110-150
          diastolic: Math.floor(Math.random() * 30) + 70,  // 70-100
          timestamp: new Date().toISOString()
        };
      case 'glucose_monitor':
        return {
          glucose: Math.floor(Math.random() * 100) + 80, // 80-180 mg/dL
          timestamp: new Date().toISOString()
        };
      case 'temperature_sensor':
        return {
          temperature: (Math.random() * 4 + 96.5).toFixed(1), // 96.5-100.5°F
          timestamp: new Date().toISOString()
        };
      case 'pulse_oximeter':
        return {
          oxygenSaturation: Math.floor(Math.random() * 5) + 95, // 95-100%
          pulseRate: Math.floor(Math.random() * 40) + 60,
          timestamp: new Date().toISOString()
        };
      default:
        return { value: Math.random() * 100, timestamp: new Date().toISOString() };
    }
  };

  const registerDevice = async () => {
    if (!newDeviceName.trim()) {
      alert('Please enter a device name');
      return;
    }

    try {
      setLoading(true);
      
      const deviceId = await iotHealthMonitoring.registerDevice(
        patientId,
        newDeviceType,
        newDeviceName
      );

      if (deviceId) {
        alert('Device registered successfully');
        setNewDeviceName('');
        await loadIoTData();
      }
    } catch (error) {
      console.error('Failed to register device:', error);
      alert('Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  const calibrateDevice = async (deviceId: string) => {
    try {
      const success = await iotHealthMonitoring.calibrateDevice(deviceId, {
        timestamp: new Date().toISOString(),
        calibrationData: { reference: 'standard', accuracy: 0.95 }
      });

      if (success) {
        alert('Device calibrated successfully');
        await loadIoTData();
      }
    } catch (error) {
      console.error('Failed to calibrate device:', error);
      alert('Device calibration failed');
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const success = await iotHealthMonitoring.acknowledgeAlert(alertId);
      
      if (success) {
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'heart_rate_monitor': return <Heart className="w-6 h-6" />;
      case 'blood_pressure_monitor': return <Activity className="w-6 h-6" />;
      case 'glucose_monitor': return <Zap className="w-6 h-6" />;
      case 'temperature_sensor': return <Thermometer className="w-6 h-6" />;
      case 'pulse_oximeter': return <Monitor className="w-6 h-6" />;
      case 'fitness_tracker': return <Watch className="w-6 h-6" />;
      case 'smart_scale': return <TrendingUp className="w-6 h-6" />;
      default: return <Smartphone className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'inactive': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-6 h-6 mr-2 text-blue-600" />
            IoT Health Monitoring
          </CardTitle>
          <CardDescription>
            Real-time health monitoring through connected IoT devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{devices.length}</div>
              <div className="text-sm text-gray-600">Connected Devices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {devices.filter(d => d.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active Devices</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.length}</div>
              <div className="text-sm text-gray-600">Metrics Collected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {alerts.filter(a => !a.acknowledged).length}
              </div>
              <div className="text-sm text-gray-600">Unread Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.filter(a => !a.acknowledged).length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => !a.acknowledged).slice(0, 3).map((alert) => (
            <Alert key={alert.id} className={getAlertColor(alert.type)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.type.toUpperCase()} Alert</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  Acknowledge
                </Button>
              </AlertTitle>
              <AlertDescription>
                {alert.message}
                <br />
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Interface */}
      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Data</TabsTrigger>
          <TabsTrigger value="metrics">Metrics History</TabsTrigger>
          <TabsTrigger value="register">Add Device</TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <Card key={device.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      {getDeviceIcon(device.deviceType)}
                      <span className="ml-2">{device.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {device.status === 'active' ? (
                        <Wifi className={`w-4 h-4 ${getStatusColor(device.status)}`} />
                      ) : (
                        <WifiOff className={`w-4 h-4 ${getStatusColor(device.status)}`} />
                      )}
                      {device.batteryLevel !== undefined && (
                        <div className="flex items-center">
                          <Battery className={`w-4 h-4 ${getBatteryColor(device.batteryLevel)}`} />
                          <span className="text-xs ml-1">{device.batteryLevel}%</span>
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {device.deviceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status</span>
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Sync</span>
                      <span className="text-sm text-gray-600">
                        {new Date(device.lastSync).toLocaleString()}
                      </span>
                    </div>

                    {device.batteryLevel !== undefined && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Battery</span>
                          <span className="text-sm">{device.batteryLevel}%</span>
                        </div>
                        <Progress value={device.batteryLevel} className="h-2" />
                      </div>
                    )}

                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Settings
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => calibrateDevice(device.id)}
                      >
                        Calibrate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {devices.length === 0 && (
              <div className="col-span-full text-center py-8">
                <Smartphone className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No devices connected</p>
                <p className="text-sm text-gray-500">Add your first IoT health device to get started</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Real-time Data Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.filter(d => d.status === 'active').map((device) => (
              <Card key={device.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-lg">
                    {getDeviceIcon(device.deviceType)}
                    <span className="ml-2">{device.name}</span>
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {realTimeData[device.id] && (
                      <>
                        {Object.entries(realTimeData[device.id])
                          .filter(([key]) => key !== 'timestamp')
                          .map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="font-mono text-lg">
                              {typeof value === 'number' ? value.toFixed(1) : value}
                              {key === 'heartRate' && ' BPM'}
                              {key === 'temperature' && '°F'}
                              {key === 'glucose' && ' mg/dL'}
                              {key === 'oxygenSaturation' && '%'}
                            </span>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500 mt-2">
                          Last updated: {new Date(realTimeData[device.id].timestamp).toLocaleTimeString()}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {devices.filter(d => d.status === 'active').length === 0 && (
              <div className="col-span-full text-center py-8">
                <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No active devices for real-time monitoring</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Metrics History Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Health Metrics</CardTitle>
              <CardDescription>
                Historical data from your connected IoT devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.slice(0, 20).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        metric.quality === 'good' ? 'bg-green-500' :
                        metric.quality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">
                          {metric.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(metric.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg">
                        {metric.value} {metric.unit}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {metric.quality}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {metrics.length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No metrics data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Register Device Tab */}
        <TabsContent value="register" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Register New IoT Device
              </CardTitle>
              <CardDescription>
                Add a new health monitoring device to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deviceType">Device Type</Label>
                  <select
                    id="deviceType"
                    value={newDeviceType}
                    onChange={(e) => setNewDeviceType(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="heart_rate_monitor">Heart Rate Monitor</option>
                    <option value="blood_pressure_monitor">Blood Pressure Monitor</option>
                    <option value="glucose_monitor">Glucose Monitor</option>
                    <option value="temperature_sensor">Temperature Sensor</option>
                    <option value="pulse_oximeter">Pulse Oximeter</option>
                    <option value="fitness_tracker">Fitness Tracker</option>
                    <option value="smart_scale">Smart Scale</option>
                    <option value="sleep_tracker">Sleep Tracker</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="deviceName">Device Name</Label>
                  <Input
                    id="deviceName"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="My Heart Rate Monitor"
                  />
                </div>
              </div>
              
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Device Registration</AlertTitle>
                <AlertDescription>
                  Make sure your device is in pairing mode and within range. 
                  The device will be automatically calibrated after registration.
                </AlertDescription>
              </Alert>
              
              <Button onClick={registerDevice} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering Device...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Register Device
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Settings Modal */}
      {selectedDevice && (
        <Card className="fixed inset-0 z-50 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Device Settings: {selectedDevice.name}</span>
              <Button variant="ghost" onClick={() => setSelectedDevice(null)}>
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Device ID</Label>
                <p className="font-mono text-sm">{selectedDevice.id}</p>
              </div>
              
              <div>
                <Label>Device Type</Label>
                <p>{selectedDevice.deviceType}</p>
              </div>
              
              <div>
                <Label>Supported Metrics</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDevice.metrics.map((metric, index) => (
                    <Badge key={index} variant="outline">{metric}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => calibrateDevice(selectedDevice.id)}>
                  Recalibrate Device
                </Button>
                <Button variant="outline">
                  Update Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IoTHealthMonitoring;
