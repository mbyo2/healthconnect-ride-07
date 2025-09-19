import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  CreditCard, 
  MapPin, 
  Smartphone,
  TrendingUp,
  Eye,
  RefreshCw
} from 'lucide-react';
import { fraudDetectionEngine, FraudAlert } from '@/utils/fraud-detection';
import { sessionManager, SecurityEvent } from '@/utils/session-manager';
import { securityNotificationService, SecurityNotification } from '@/utils/security-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecurityMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  activeSessions: number;
  fraudScore: number;
  recentEvents: number;
  blockedTransactions: number;
}

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalAlerts: 0,
    criticalAlerts: 0,
    activeSessions: 0,
    fraudScore: 0,
    recentEvents: 0,
    blockedTransactions: 0
  });
  
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time subscriptions
    const alertsSubscription = supabase
      .channel('fraud-alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fraud_alerts' },
        () => loadFraudAlerts()
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel('security-events')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'security_events' },
        () => loadSecurityEvents()
      )
      .subscribe();

    return () => {
      alertsSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadFraudAlerts(),
        loadSecurityEvents(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load security dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get fraud alerts count
      const { count: totalAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: criticalAlerts } = await supabase
        .from('fraud_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('severity', 'critical')
        .eq('resolved', false);

      // Get active sessions
      const sessions = await sessionManager.getUserSessions(user.id);
      const activeSessions = sessions.length;

      // Get recent security events
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentEvents } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('timestamp', oneDayAgo);

      // Calculate average fraud score from recent alerts
      const { data: recentAlerts } = await supabase
        .from('fraud_alerts')
        .select('risk_score')
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo);

      const avgFraudScore = recentAlerts?.length 
        ? recentAlerts.reduce((sum, alert) => sum + alert.risk_score, 0) / recentAlerts.length
        : 0;

      setMetrics({
        totalAlerts: totalAlerts || 0,
        criticalAlerts: criticalAlerts || 0,
        activeSessions,
        fraudScore: Math.round(avgFraudScore),
        recentEvents: recentEvents || 0,
        blockedTransactions: 0 // Would be calculated from blocked payments
      });

    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadFraudAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const alerts = await fraudDetectionEngine.getFraudAlerts(user.id);
      setFraudAlerts(alerts.slice(0, 10)); // Show latest 10
    } catch (error) {
      console.error('Error loading fraud alerts:', error);
    }
  };

  const loadSecurityEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: events } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (events) {
        setSecurityEvents(events.map(event => ({
          type: event.type,
          userId: event.user_id,
          deviceInfo: event.device_info,
          ipAddress: event.ip_address,
          timestamp: new Date(event.timestamp),
          details: event.details
        })));
      }
    } catch (error) {
      console.error('Error loading security events:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const notifications = await securityNotificationService.getNotifications(user.id);
      setNotifications(notifications.slice(0, 5)); // Show latest 5
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const resolveAlert = async (alertId: string) => {
    const success = await fraudDetectionEngine.resolveFraudAlert(alertId, 'Resolved by user');
    if (success) {
      toast.success('Alert resolved');
      loadFraudAlerts();
      loadMetrics();
    } else {
      toast.error('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor security events, fraud alerts, and system health
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Critical Alerts Banner */}
      {metrics.criticalAlerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Security Alerts</AlertTitle>
          <AlertDescription>
            You have {metrics.criticalAlerts} critical security alert{metrics.criticalAlerts > 1 ? 's' : ''} 
            that require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAlerts}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSessions}</div>
            <p className="text-xs text-muted-foreground">Current</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskLevelColor(metrics.fraudScore)}`}>
              {metrics.fraudScore}
            </div>
            <p className="text-xs text-muted-foreground">Average (24h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.blockedTransactions}</div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Fraud Alerts</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fraud Alerts</CardTitle>
              <CardDescription>
                Latest fraud detection alerts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fraudAlerts.length === 0 ? (
                <p className="text-muted-foreground">No fraud alerts found</p>
              ) : (
                <div className="space-y-4">
                  {fraudAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(alert.severity) as any}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{alert.type.replace('_', ' ').toUpperCase()}</span>
                          <span className={`text-sm ${getRiskLevelColor(alert.riskScore)}`}>
                            Risk: {alert.riskScore}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.createdAt.toLocaleString()}
                        </p>
                      </div>
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Events</CardTitle>
              <CardDescription>
                Recent security-related activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityEvents.length === 0 ? (
                <p className="text-muted-foreground">No security events found</p>
              ) : (
                <div className="space-y-3">
                  {securityEvents.map((event, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {event.type === 'login' && <Users className="h-4 w-4 text-green-600" />}
                        {event.type === 'logout' && <Users className="h-4 w-4 text-gray-600" />}
                        {event.type === 'suspicious_activity' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {event.type === 'password_change' && <Shield className="h-4 w-4 text-blue-600" />}
                        {event.type === 'biometric_setup' && <Smartphone className="h-4 w-4 text-purple-600" />}
                        {event.type === '2fa_enabled' && <Shield className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {event.type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.deviceInfo} • {event.ipAddress}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.timestamp.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Notifications</CardTitle>
              <CardDescription>
                Recent security notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-muted-foreground">No notifications found</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge variant={getSeverityColor(notification.severity) as any}>
                          {notification.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.createdAt.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Trends</CardTitle>
                <CardDescription>
                  Security metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Analytics charts would be implemented here with a charting library like Chart.js or Recharts
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>
                  Breakdown of security risks by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Risk distribution charts would be implemented here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
