import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Shield, 
  Activity, 
  BarChart3, 
  AlertTriangle, 
  Zap,
  Heart,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdvancedDashboardProps {
  userRole?: 'patient' | 'doctor' | 'nurse' | 'admin';
}

export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ userRole = 'patient' }) => {
  const [dashboardStats, setDashboardStats] = useState({
    aiDiagnostics: { active: 12, completed: 156, accuracy: 94.2 },
    blockchainRecords: { secured: 1247, transactions: 89, integrity: 100 },
    iotDevices: { connected: 8, monitoring: 24, alerts: 3 },
    emergencyResponse: { active: 2, resolved: 45, avgTime: 4.2 },
    compliance: { score: 98.5, audits: 12, violations: 0 }
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: 'ai_diagnostic', message: 'AI analysis completed for chest X-ray', time: '2 min ago', status: 'completed' },
    { id: 2, type: 'blockchain', message: 'Medical record updated with blockchain verification', time: '15 min ago', status: 'verified' },
    { id: 3, type: 'iot', message: 'Heart rate monitor detected irregular pattern', time: '1 hour ago', status: 'alert' },
    { id: 4, type: 'emergency', message: 'Emergency response protocol activated', time: '3 hours ago', status: 'resolved' }
  ]);

  const advancedFeatures = [
    {
      title: 'AI Diagnostic Assistant',
      description: 'Advanced AI-powered symptom analysis and diagnostic support',
      icon: <Brain className="h-6 w-6" />,
      route: '/ai-diagnostics',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: `${dashboardStats.aiDiagnostics.accuracy}% accuracy`
    },
    {
      title: 'Blockchain Medical Records',
      description: 'Secure, immutable medical data with patient consent management',
      icon: <Shield className="h-6 w-6" />,
      route: '/blockchain-records',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: `${dashboardStats.blockchainRecords.secured} records secured`
    },
    {
      title: 'IoT Health Monitoring',
      description: 'Real-time health tracking with connected medical devices',
      icon: <Activity className="h-6 w-6" />,
      route: '/iot-monitoring',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      stats: `${dashboardStats.iotDevices.connected} devices connected`
    },
    {
      title: 'Health Data Analytics',
      description: 'Advanced visualization and predictive health analytics',
      icon: <BarChart3 className="h-6 w-6" />,
      route: '/health-analytics',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: 'Real-time insights'
    },
    {
      title: 'Emergency Response',
      description: '24/7 emergency alert system with automated response protocols',
      icon: <AlertTriangle className="h-6 w-6" />,
      route: '/emergency-response',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      stats: `${dashboardStats.emergencyResponse.avgTime}min avg response`
    },
    {
      title: 'Compliance Management',
      description: 'HIPAA, GDPR compliance monitoring and audit reporting',
      icon: <CheckCircle className="h-6 w-6" />,
      route: '/compliance-audit',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      stats: `${dashboardStats.compliance.score}% compliance score`
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'verified': return 'text-blue-600';
      case 'alert': return 'text-red-600';
      case 'resolved': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'ai_diagnostic': return <Brain className="h-4 w-4" />;
      case 'blockchain': return <Shield className="h-4 w-4" />;
      case 'iot': return <Activity className="h-4 w-4" />;
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto">
      <div className="space-y-6 p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Zap className="h-8 w-8 text-blue-600" />
              Advanced Healthcare Platform
            </h1>
            <p className="text-gray-600 mt-2">
              Next-generation healthcare technology and analytics dashboard
            </p>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            Enterprise Edition
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI Diagnostics</p>
                  <p className="text-2xl font-bold text-purple-600">{dashboardStats.aiDiagnostics.active}</p>
                  <p className="text-xs text-gray-500">Active analyses</p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Blockchain Records</p>
                  <p className="text-2xl font-bold text-green-600">{dashboardStats.blockchainRecords.secured}</p>
                  <p className="text-xs text-gray-500">Secured records</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">IoT Monitoring</p>
                  <p className="text-2xl font-bold text-red-600">{dashboardStats.iotDevices.connected}</p>
                  <p className="text-xs text-gray-500">Connected devices</p>
                </div>
                <Activity className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold text-indigo-600">{dashboardStats.compliance.score}%</p>
                  <p className="text-xs text-gray-500">HIPAA/GDPR</p>
                </div>
                <CheckCircle className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="features" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="features">Advanced Features</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="analytics">System Analytics</TabsTrigger>
          </TabsList>

          {/* Advanced Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advancedFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-3`}>
                      <div className={feature.color}>
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{feature.stats}</span>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={feature.route} className="flex items-center gap-2">
                          Open <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent System Activity
                </CardTitle>
                <CardDescription>
                  Latest updates from advanced healthcare systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className={`p-2 rounded-lg bg-gray-50 ${getStatusColor(activity.status)}`}>
                        {getStatusIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                  <CardDescription>Overall platform health and performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>AI Processing Efficiency</span>
                      <span>94.2%</span>
                    </div>
                    <Progress value={94.2} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Blockchain Integrity</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>IoT Device Connectivity</span>
                      <span>87.5%</span>
                    </div>
                    <Progress value={87.5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Emergency Response Time</span>
                      <span>92.8%</span>
                    </div>
                    <Progress value={92.8} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                  <CardDescription>Platform utilization and user engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Users</span>
                      <span className="font-semibold">2,847</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Diagnostics Run</span>
                      <span className="font-semibold">156 today</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Records Secured</span>
                      <span className="font-semibold">1,247 total</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Emergency Responses</span>
                      <span className="font-semibold">2 active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Compliance Score</span>
                      <span className="font-semibold text-green-600">98.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedDashboard;
