import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  RefreshCw,
  Bluetooth,
  Usb,
  Smartphone,
  Activity,
  Shield,
  Globe,
  Zap
} from 'lucide-react';
import { deviceConnectivityTest, ConnectivityTestResult, DeviceCapability } from '@/utils/device-connectivity-test';
import { deviceConnectionManager, DeviceConnectionConfig } from '@/utils/device-connection-manager';

interface DeviceConnectivityDiagnosticsProps {
  onTestComplete?: (result: ConnectivityTestResult) => void;
}

export const DeviceConnectivityDiagnostics: React.FC<DeviceConnectivityDiagnosticsProps> = ({ 
  onTestComplete 
}) => {
  const [testResult, setTestResult] = useState<ConnectivityTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  const [deviceTests, setDeviceTests] = useState<Record<string, boolean>>({});
  const [testingDevice, setTestingDevice] = useState<string | null>(null);

  useEffect(() => {
    runInitialTest();
  }, []);

  const runInitialTest = async () => {
    await runConnectivityTest();
  };

  const runConnectivityTest = async () => {
    try {
      setTesting(true);
      setTestProgress(0);
      setCurrentTest('Initializing connectivity test...');

      const result = await deviceConnectivityTest.runComprehensiveTest();
      setTestResult(result);
      setTestProgress(100);
      setCurrentTest('Test completed');
      
      if (onTestComplete) {
        onTestComplete(result);
      }
    } catch (error) {
      console.error('Connectivity test failed:', error);
      setTestResult({
        overall: 'failed',
        capabilities: [],
        errors: ['Test failed to complete'],
        recommendations: ['Refresh the page and try again']
      });
    } finally {
      setTesting(false);
    }
  };

  const testSpecificDevice = async (deviceType: string) => {
    try {
      setTestingDevice(deviceType);
      const canConnect = await deviceConnectivityTest.testSpecificDevice(deviceType);
      setDeviceTests(prev => ({ ...prev, [deviceType]: canConnect }));
    } catch (error) {
      console.error(`Device test failed for ${deviceType}:`, error);
      setDeviceTests(prev => ({ ...prev, [deviceType]: false }));
    } finally {
      setTestingDevice(null);
    }
  };

  const getCapabilityIcon = (name: string) => {
    switch (name) {
      case 'Web Bluetooth API':
        return <Bluetooth className="w-5 h-5" />;
      case 'Web USB API':
        return <Usb className="w-5 h-5" />;
      case 'Network Connectivity':
        return <Globe className="w-5 h-5" />;
      case 'Geolocation API':
        return <Settings className="w-5 h-5" />;
      case 'Device Motion API':
        return <Activity className="w-5 h-5" />;
      case 'Permissions API':
        return <Shield className="w-5 h-5" />;
      case 'Capacitor Native Features':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const getStatusColor = (supported: boolean) => {
    return supported ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = (supported: boolean) => {
    return supported ? (
      <Badge className="bg-green-100 text-green-800">Supported</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Not Supported</Badge>
    );
  };

  const deviceTypes = [
    { type: 'heart_rate_monitor', name: 'Heart Rate Monitor', icon: <Activity className="w-4 h-4" /> },
    { type: 'blood_pressure_monitor', name: 'Blood Pressure Monitor', icon: <Activity className="w-4 h-4" /> },
    { type: 'glucose_monitor', name: 'Glucose Monitor', icon: <Zap className="w-4 h-4" /> },
    { type: 'temperature_sensor', name: 'Temperature Sensor', icon: <Settings className="w-4 h-4" /> },
    { type: 'pulse_oximeter', name: 'Pulse Oximeter', icon: <Activity className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-6 h-6 mr-2 text-blue-600" />
              Device Connectivity Diagnostics
            </div>
            <Button
              onClick={runConnectivityTest}
              disabled={testing}
              variant="outline"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Comprehensive diagnostics for IoT device connectivity and compatibility
          </CardDescription>
        </CardHeader>
        
        {testing && (
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Testing Progress</span>
                <span className="text-sm text-gray-600">{testProgress}%</span>
              </div>
              <Progress value={testProgress} className="h-2" />
              <p className="text-sm text-gray-600">{currentTest}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Overall Status */}
      {testResult && (
        <Alert className={`${
          testResult.overall === 'success' ? 'border-green-500 bg-green-50' :
          testResult.overall === 'partial' ? 'border-yellow-500 bg-yellow-50' :
          'border-red-500 bg-red-50'
        }`}>
          {testResult.overall === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {testResult.overall === 'success' ? 'All Systems Ready' :
             testResult.overall === 'partial' ? 'Limited Connectivity Available' :
             'Connectivity Issues Detected'}
          </AlertTitle>
          <AlertDescription>
            {testResult.overall === 'success' ? 
              'Your device supports all required connectivity features for IoT health monitoring.' :
              testResult.overall === 'partial' ?
              'Some connectivity features are available. You may experience limited functionality.' :
              'Critical connectivity issues detected. Device connection may not work properly.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Results */}
      {testResult && (
        <Tabs defaultValue="capabilities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capabilities">System Capabilities</TabsTrigger>
            <TabsTrigger value="devices">Device Tests</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          {/* System Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Capabilities Assessment</CardTitle>
                <CardDescription>
                  Detailed breakdown of your device's connectivity capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResult.capabilities.map((capability, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={getStatusColor(capability.supported)}>
                          {getCapabilityIcon(capability.name)}
                        </div>
                        <div>
                          <h4 className="font-medium">{capability.name}</h4>
                          {capability.error && (
                            <p className="text-sm text-red-600">{capability.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(capability.supported)}
                        {capability.supported ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Device Tests Tab */}
          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Device-Specific Connectivity Tests</CardTitle>
                <CardDescription>
                  Test connectivity for specific types of health monitoring devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deviceTypes.map((device) => (
                    <div key={device.type} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-blue-600">
                          {device.icon}
                        </div>
                        <div>
                          <h4 className="font-medium">{device.name}</h4>
                          <p className="text-sm text-gray-600">
                            {device.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {deviceTests[device.type] !== undefined && (
                          <Badge className={deviceTests[device.type] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {deviceTests[device.type] ? 'Compatible' : 'Not Compatible'}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testSpecificDevice(device.type)}
                          disabled={testingDevice === device.type}
                        >
                          {testingDevice === device.type ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting & Recommendations</CardTitle>
                <CardDescription>
                  Solutions for common connectivity issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Errors */}
                  {testResult.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-3">Issues Detected:</h4>
                      <div className="space-y-2">
                        {testResult.errors.map((error, index) => (
                          <Alert key={index} className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {testResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-3">Recommended Actions:</h4>
                      <div className="space-y-2">
                        {testResult.recommendations.map((recommendation, index) => (
                          <Alert key={index} className="border-blue-200 bg-blue-50">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>{recommendation}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Troubleshooting Tips */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">General Troubleshooting Tips:</h4>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium flex items-center">
                          <Bluetooth className="w-4 h-4 mr-2 text-blue-600" />
                          Bluetooth Issues
                        </h5>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Ensure Bluetooth is enabled on your device</li>
                          <li>• Check that your browser supports Web Bluetooth API</li>
                          <li>• Make sure the health device is in pairing mode</li>
                          <li>• Try refreshing the page and testing again</li>
                        </ul>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium flex items-center">
                          <Shield className="w-4 h-4 mr-2 text-green-600" />
                          Permission Issues
                        </h5>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Allow location access when prompted</li>
                          <li>• Enable camera/microphone permissions if needed</li>
                          <li>• Check browser settings for blocked permissions</li>
                          <li>• Try using HTTPS instead of HTTP</li>
                        </ul>
                      </div>

                      <div className="p-3 border rounded-lg">
                        <h5 className="font-medium flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-purple-600" />
                          Network Issues
                        </h5>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Check your internet connection</li>
                          <li>• Disable VPN or proxy if active</li>
                          <li>• Try switching to a different network</li>
                          <li>• Clear browser cache and cookies</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DeviceConnectivityDiagnostics;
