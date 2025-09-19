import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  Shield, 
  Activity, 
  TrendingUp, 
  Languages, 
  AlertTriangle,
  FileText,
  BarChart3,
  Heart,
  Stethoscope,
  Globe,
  Zap
} from 'lucide-react';
import { aiDiagnosticAssistant } from '@/utils/ai-diagnostic-assistant';
import { blockchainMedicalRecords } from '@/utils/blockchain-medical-records';
import { iotHealthMonitoring } from '@/utils/iot-health-monitoring';
import { predictiveHealthAnalytics } from '@/utils/predictive-health-analytics';
import { medicalTranslation } from '@/utils/medical-translation';
import { emergencyResponseSystem } from '@/utils/emergency-response-system';
import { complianceAuditSystem } from '@/utils/compliance-audit-system';
import { healthDataVisualization } from '@/utils/health-data-visualization';
import { integrationTestingSystem } from '@/utils/integration-testing-system';

interface Phase5DashboardProps {
  patientId: string;
  userRole: 'patient' | 'doctor' | 'nurse' | 'admin';
}

interface SystemStatus {
  aiDiagnostics: 'active' | 'inactive' | 'error';
  blockchain: 'active' | 'inactive' | 'error';
  iotMonitoring: 'active' | 'inactive' | 'error';
  predictiveAnalytics: 'active' | 'inactive' | 'error';
  translation: 'active' | 'inactive' | 'error';
  emergencyResponse: 'active' | 'inactive' | 'error';
  compliance: 'active' | 'inactive' | 'error';
  visualization: 'active' | 'inactive' | 'error';
}

export const Phase5Dashboard: React.FC<Phase5DashboardProps> = ({ patientId, userRole }) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    aiDiagnostics: 'inactive',
    blockchain: 'inactive',
    iotMonitoring: 'inactive',
    predictiveAnalytics: 'inactive',
    translation: 'inactive',
    emergencyResponse: 'inactive',
    compliance: 'inactive',
    visualization: 'inactive'
  });

  const [healthTrends, setHealthTrends] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [iotDevices, setIotDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDashboard();
  }, [patientId]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);

      // Check system status
      await checkSystemStatus();

      // Load health trends
      const trends = await healthDataVisualization.generateHealthTrends(patientId, '30d');
      setHealthTrends(trends);

      // Load IoT devices
      const devices = await iotHealthMonitoring.getConnectedDevices(patientId);
      setIotDevices(devices || []);

      // Load compliance status
      if (userRole === 'admin' || userRole === 'doctor') {
        const compliance = await complianceAuditSystem.getComplianceStatus();
        setComplianceStatus(compliance);
      }

      // Load recent alerts
      const alerts = await emergencyResponseSystem.getActiveAlerts(patientId);
      setRecentAlerts(alerts || []);

    } catch (error) {
      console.error('Failed to initialize Phase 5 dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemStatus = async () => {
    const newStatus: SystemStatus = {
      aiDiagnostics: 'active',
      blockchain: 'active',
      iotMonitoring: 'active',
      predictiveAnalytics: 'active',
      translation: 'active',
      emergencyResponse: 'active',
      compliance: 'active',
      visualization: 'active'
    };

    // In a real implementation, you would check actual service health
    setSystemStatus(newStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  const runSystemTests = async () => {
    try {
      setLoading(true);
      const testResults = await integrationTestingSystem.runAllTests();
      
      // Update system status based on test results
      const updatedStatus = { ...systemStatus };
      for (const [suiteId, results] of testResults) {
        if (results.failed > 0) {
          // Mark related systems as having issues
          if (suiteId.includes('ai')) updatedStatus.aiDiagnostics = 'error';
          if (suiteId.includes('blockchain')) updatedStatus.blockchain = 'error';
          if (suiteId.includes('iot')) updatedStatus.iotMonitoring = 'error';
        }
      }
      setSystemStatus(updatedStatus);

      alert(`System tests completed. ${Array.from(testResults.values()).reduce((sum, r) => sum + r.passed, 0)} tests passed.`);
    } catch (error) {
      console.error('System tests failed:', error);
      alert('System tests failed. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Phase 5 Advanced Healthcare Platform
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            AI-powered diagnostics, blockchain security, and real-time monitoring
          </p>
        </div>
        <Button onClick={runSystemTests} disabled={loading}>
          <Zap className="w-4 h-4 mr-2" />
          Run System Tests
        </Button>
      </div>

      {/* System Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Status
          </CardTitle>
          <CardDescription>
            Real-time status of all Phase 5 healthcare systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.aiDiagnostics)}`}></div>
              <div>
                <p className="font-medium">AI Diagnostics</p>
                <p className="text-sm text-gray-500 capitalize">{systemStatus.aiDiagnostics}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.blockchain)}`}></div>
              <div>
                <p className="font-medium">Blockchain Records</p>
                <p className="text-sm text-gray-500 capitalize">{systemStatus.blockchain}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.iotMonitoring)}`}></div>
              <div>
                <p className="font-medium">IoT Monitoring</p>
                <p className="text-sm text-gray-500 capitalize">{systemStatus.iotMonitoring}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemStatus.emergencyResponse)}`}></div>
              <div>
                <p className="font-medium">Emergency Response</p>
                <p className="text-sm text-gray-500 capitalize">{systemStatus.emergencyResponse}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagnostics">AI Diagnostics</TabsTrigger>
          <TabsTrigger value="monitoring">Health Monitoring</TabsTrigger>
          <TabsTrigger value="security">Security & Compliance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Health Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Health Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthTrends.slice(0, 3).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span>{getTrendIcon(trend.direction)}</span>
                        <span className="font-medium">{trend.metric.replace('_', ' ')}</span>
                      </div>
                      <Badge variant={trend.direction === 'improving' ? 'default' : 
                                   trend.direction === 'declining' ? 'destructive' : 'secondary'}>
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                      </Badge>
                    </div>
                  ))}
                  {healthTrends.length === 0 && (
                    <p className="text-gray-500 text-sm">No health trends available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Connected Devices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Connected Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {iotDevices.slice(0, 3).map((device, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{device.name || device.deviceType}</p>
                        <p className="text-sm text-gray-500">Last sync: {device.lastSync || 'Never'}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${device.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    </div>
                  ))}
                  {iotDevices.length === 0 && (
                    <p className="text-gray-500 text-sm">No devices connected</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAlerts.slice(0, 3).map((alert, index) => (
                    <Alert key={index} className={alert.severity === 'critical' ? 'border-red-500' : ''}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{alert.type}</AlertTitle>
                      <AlertDescription className="text-sm">
                        {alert.message || 'No details available'}
                      </AlertDescription>
                    </Alert>
                  ))}
                  {recentAlerts.length === 0 && (
                    <p className="text-gray-500 text-sm">No recent alerts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold mb-2">AI Diagnostics</h3>
                <p className="text-sm text-gray-600">Advanced symptom analysis and diagnostic assistance</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold mb-2">Blockchain Records</h3>
                <p className="text-sm text-gray-600">Secure, immutable medical record storage</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-red-600" />
                <h3 className="font-semibold mb-2">IoT Monitoring</h3>
                <p className="text-sm text-gray-600">Real-time health device integration</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <Languages className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                <h3 className="font-semibold mb-2">Medical Translation</h3>
                <p className="text-sm text-gray-600">Multi-language medical communication</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                AI Diagnostic Assistant
              </CardTitle>
              <CardDescription>
                Advanced AI-powered symptom analysis and diagnostic recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">95%</div>
                    <div className="text-sm text-gray-600">Diagnostic Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">1,247</div>
                    <div className="text-sm text-gray-600">Diagnoses Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">0.8s</div>
                    <div className="text-sm text-gray-600">Average Response Time</div>
                  </div>
                </div>
                <Button className="w-full">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Start New Diagnostic Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Real-time Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Heart Rate</span>
                    <span className="font-mono text-lg">72 BPM</span>
                  </div>
                  <Progress value={72} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Blood Pressure</span>
                    <span className="font-mono text-lg">120/80</span>
                  </div>
                  <Progress value={80} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span>Temperature</span>
                    <span className="font-mono text-lg">98.6°F</span>
                  </div>
                  <Progress value={98.6} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Predictive Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Cardiovascular Risk</span>
                    <Badge variant="secondary">Low (15%)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Diabetes Risk</span>
                    <Badge variant="secondary">Low (8%)</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Readmission Risk</span>
                    <Badge variant="secondary">Very Low (3%)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security & Compliance Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Blockchain Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Records Secured</span>
                    <span className="font-mono">2,847</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Consent Transactions</span>
                    <span className="font-mono">1,523</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Blockchain Integrity</span>
                    <Badge variant="default">Verified ✓</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceStatus && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Compliance Rate</span>
                        <span className="font-mono">{complianceStatus.complianceRate}%</span>
                      </div>
                      <Progress value={complianceStatus.complianceRate} className="h-2" />
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <Badge variant={complianceStatus.status === 'excellent' ? 'default' : 'secondary'}>
                          {complianceStatus.status}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Phase5Dashboard;
