import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  Eye,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { complianceAuditSystem } from '@/utils/compliance-audit-system';

interface ComplianceAuditProps {
  userRole: 'patient' | 'doctor' | 'nurse' | 'admin';
}

interface AuditEvent {
  id: string;
  eventType: string;
  resourceType: string;
  userId: string;
  userRole: string;
  action: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags: any[];
}

interface ComplianceReport {
  id: string;
  reportType: string;
  period: { startDate: string; endDate: string };
  summary: {
    totalEvents: number;
    violations: number;
    warnings: number;
    compliantEvents: number;
    riskDistribution: Record<string, number>;
  };
  findings: any[];
  recommendations: string[];
  generatedAt: string;
  status: string;
}

export const ComplianceAudit: React.FC<ComplianceAuditProps> = ({ userRole }) => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'doctor') {
      loadComplianceData();
    }
  }, [userRole, selectedTimeRange, riskFilter, eventTypeFilter]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);

      // Get compliance status
      const status = await complianceAuditSystem.getComplianceStatus();
      setComplianceStatus(status);

      // Mock audit events (in real implementation, fetch from API)
      const mockEvents: AuditEvent[] = [
        {
          id: 'audit_1',
          eventType: 'access',
          resourceType: 'patient_data',
          userId: 'user_123',
          userRole: 'doctor',
          action: 'view_medical_record',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          riskLevel: 'low',
          complianceFlags: [{ regulation: 'HIPAA', status: 'compliant' }]
        },
        {
          id: 'audit_2',
          eventType: 'modification',
          resourceType: 'medical_record',
          userId: 'user_456',
          userRole: 'nurse',
          action: 'update_patient_notes',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          riskLevel: 'medium',
          complianceFlags: [{ regulation: 'HIPAA', status: 'warning' }]
        },
        {
          id: 'audit_3',
          eventType: 'access',
          resourceType: 'patient_data',
          userId: 'user_789',
          userRole: 'admin',
          action: 'bulk_export',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          riskLevel: 'high',
          complianceFlags: [{ regulation: 'HIPAA', status: 'violation' }]
        }
      ];

      // Apply filters
      let filteredEvents = mockEvents;
      if (riskFilter !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.riskLevel === riskFilter);
      }
      if (eventTypeFilter !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.eventType === eventTypeFilter);
      }

      setAuditEvents(filteredEvents);

      // Mock compliance reports
      const mockReports: ComplianceReport[] = [
        {
          id: 'report_1',
          reportType: 'audit_trail',
          period: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          },
          summary: {
            totalEvents: 1247,
            violations: 12,
            warnings: 45,
            compliantEvents: 1190,
            riskDistribution: { low: 1100, medium: 135, high: 10, critical: 2 }
          },
          findings: [
            {
              id: 'finding_1',
              severity: 'medium',
              regulation: 'HIPAA',
              description: 'Unauthorized access attempts detected'
            }
          ],
          recommendations: [
            'Implement additional access controls',
            'Enhance staff training on HIPAA compliance'
          ],
          generatedAt: new Date().toISOString(),
          status: 'final'
        }
      ];

      setComplianceReports(mockReports);

    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewReport = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - (selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString();
      
      const report = await complianceAuditSystem.generateComplianceReport(
        'audit_trail',
        startDate,
        endDate,
        ['HIPAA', 'GDPR'],
        'admin_user'
      );

      if (report) {
        setComplianceReports([report, ...complianceReports]);
        alert('Compliance report generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (report: ComplianceReport) => {
    const reportData = JSON.stringify(report, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600';
      case 'violation': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (userRole !== 'admin' && userRole !== 'doctor') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Access restricted to administrators and healthcare providers</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto">
      <div className="space-y-6 p-4 pb-8">
        {/* Header */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Compliance Audit System
            </div>
            <Button onClick={generateNewReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </CardTitle>
          <CardDescription>
            HIPAA, GDPR, and healthcare compliance monitoring and reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {complianceStatus && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {complianceStatus.complianceRate || 0}%
                </div>
                <div className="text-sm text-gray-600">Compliance Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  complianceStatus.status === 'excellent' ? 'text-green-600' : 
                  complianceStatus.status === 'good' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {complianceStatus.status?.toUpperCase() || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">Overall Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {complianceStatus.summary?.totalEvents || 0}
                </div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {complianceStatus.summary?.violations || 0}
                </div>
                <div className="text-sm text-gray-600">Violations</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Audit Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Risk Level</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Risk Levels</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All Events</option>
                <option value="access">Access</option>
                <option value="modification">Modification</option>
                <option value="deletion">Deletion</option>
                <option value="authentication">Authentication</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Audit Events</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          <TabsTrigger value="dashboard">Compliance Dashboard</TabsTrigger>
        </TabsList>

        {/* Audit Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Audit Trail ({auditEvents.length} events)
              </CardTitle>
              <CardDescription>
                Real-time audit log of all system access and modifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={getRiskColor(event.riskLevel)}>
                          {event.riskLevel.toUpperCase()}
                        </Badge>
                        <div>
                          <h4 className="font-semibold">
                            {event.action.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {event.userRole} • {event.userId} • {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {event.eventType}
                        </Badge>
                        <Badge variant="outline">
                          {event.resourceType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Compliance Status:</span>
                        <div className="flex space-x-2">
                          {event.complianceFlags.map((flag, index) => (
                            <Badge
                              key={index}
                              className={getComplianceStatusColor(flag.status)}
                              variant="outline"
                            >
                              {flag.regulation}: {flag.status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {auditEvents.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No audit events match the current filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {complianceReports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{report.reportType.replace('_', ' ').toUpperCase()}</span>
                    <Badge variant={report.status === 'final' ? 'default' : 'secondary'}>
                      {report.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {new Date(report.period.startDate).toLocaleDateString()} - {new Date(report.period.endDate).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {report.summary.totalEvents}
                        </div>
                        <div className="text-xs text-gray-600">Total Events</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {report.summary.violations}
                        </div>
                        <div className="text-xs text-gray-600">Violations</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {report.summary.warnings}
                        </div>
                        <div className="text-xs text-gray-600">Warnings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {report.summary.compliantEvents}
                        </div>
                        <div className="text-xs text-gray-600">Compliant</div>
                      </div>
                    </div>

                    {/* Compliance Rate */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Compliance Rate</span>
                        <span className="text-sm">
                          {Math.round((report.summary.compliantEvents / report.summary.totalEvents) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(report.summary.compliantEvents / report.summary.totalEvents) * 100} 
                        className="h-2" 
                      />
                    </div>

                    {/* Key Findings */}
                    {report.findings.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2">Key Findings</h5>
                        <ul className="text-sm space-y-1">
                          {report.findings.slice(0, 2).map((finding, index) => (
                            <li key={index} className="flex items-start">
                              <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span>{finding.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {complianceReports.length === 0 && (
              <div className="col-span-full text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No compliance reports available</p>
                <Button onClick={generateNewReport} className="mt-4">
                  Generate First Report
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Compliance Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Compliance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {complianceStatus && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {complianceStatus.complianceRate}%
                      </div>
                      <p className="text-gray-600">Overall Compliance Rate</p>
                    </div>
                    
                    <Progress value={complianceStatus.complianceRate} className="h-3" />
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {complianceStatus.summary?.compliantEvents || 0}
                        </div>
                        <div className="text-xs text-gray-600">Compliant Events</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {complianceStatus.summary?.violations || 0}
                        </div>
                        <div className="text-xs text-gray-600">Violations</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Compliance Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {auditEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          event.riskLevel === 'critical' ? 'bg-red-500' :
                          event.riskLevel === 'high' ? 'bg-orange-500' :
                          event.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium">{event.action}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getRiskColor(event.riskLevel)} variant="outline">
                        {event.riskLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Regulatory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>HIPAA Compliance</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Compliant</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>GDPR Compliance</span>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Compliant</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>HITECH Compliance</span>
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">Review Required</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button onClick={generateNewReport} className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Compliance Report
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Audit Review
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Audit Data
                  </Button>
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

export default ComplianceAudit;
