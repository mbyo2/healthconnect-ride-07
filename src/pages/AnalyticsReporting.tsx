import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, TrendingUp, Users, DollarSign, Activity, Download,
  Calendar, Filter, Settings, Eye, RefreshCw, Building2, Clock,
  FileText, PieChart, LineChart, CheckCircle, AlertTriangle
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface AnalyticsReport {
  id: string;
  institution_id: string;
  report_name: string;
  report_type: string;
  report_category: string;
  generated_by?: string;
  generated_at: string;
  date_range_start: string;
  date_range_end: string;
  metrics_data: any;
  filters_applied: any;
  is_scheduled: boolean;
  schedule_frequency?: string;
  recipients: any[];
  file_url?: string;
}

export const AnalyticsReporting = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Form states
  const [reportForm, setReportForm] = useState({
    report_name: "",
    report_type: "summary",
    report_category: "financial",
    date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_range_end: new Date().toISOString().split('T')[0],
    is_scheduled: false,
    schedule_frequency: "weekly",
  });

  useEffect(() => {
    if (institution) {
      fetchAnalyticsData();
    }
  }, [institution]);

  const fetchAnalyticsData = async () => {
    if (!institution) return;

    try {
      const reportsRes = await supabase
        .from("analytics_reports")
        .select("*")
        .eq("institution_id", institution.id)
        .order("generated_at", { ascending: false })
        .limit(50);

      if (reportsRes.data) setReports(reportsRes.data);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("analytics_reports").insert({
        institution_id: institution.id,
        generated_by: (await supabase.auth.getUser()).data.user?.id,
        ...reportForm,
        metrics_data: {},
        filters_applied: {},
        recipients: [],
      });

      if (error) throw error;
      setShowReportDialog(false);
      fetchAnalyticsData();
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "summary": return <BarChart3 className="h-4 w-4" />;
      case "detailed": return <FileText className="h-4 w-4" />;
      case "comparative": return <LineChart className="h-4 w-4" />;
      case "trend": return <TrendingUp className="h-4 w-4" />;
      default: return <PieChart className="h-4 w-4" />;
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case "summary": return "bg-[#0073ea]";
      case "detailed": return "bg-[#00c875]";
      case "comparative": return "bg-[#a25ddc]";
      case "trend": return "bg-[#fdab3d]";
      default: return "bg-[#676879]";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "financial": return "bg-[#0073ea] text-white";
      case "operational": return "bg-[#00c875] text-white";
      case "clinical": return "bg-[#a25ddc] text-white";
      case "patient": return "bg-[#fdab3d] text-white";
      case "staff": return "bg-[#6366f1] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
            <h2 className="text-xl font-extrabold">Institution Required</h2>
            <p className="text-xs text-[#676879]">Please select an institution to access analytics and reporting.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalReports = reports.length;
  const scheduledReports = reports.filter((r) => r.is_scheduled).length;
  const financialReports = reports.filter((r) => r.report_category === "financial").length;
  const recentReports = reports.filter((r) => {
    const reportDate = new Date(r.generated_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return reportDate > weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Analytics & Reporting</h1>
              <p className="text-xs text-[#676879] font-medium">Business Intelligence & Custom Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Generate Analytics Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Report Name</Label>
                    <Input
                      value={reportForm.report_name}
                      onChange={(e) => setReportForm({ ...reportForm, report_name: e.target.value })}
                      placeholder="e.g., Monthly Financial Summary"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Report Type</Label>
                      <Select
                        value={reportForm.report_type}
                        onValueChange={(value) => setReportForm({ ...reportForm, report_type: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                          <SelectItem value="comparative">Comparative</SelectItem>
                          <SelectItem value="trend">Trend Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Category</Label>
                      <Select
                        value={reportForm.report_category}
                        onValueChange={(value) => setReportForm({ ...reportForm, report_category: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="financial">Financial</SelectItem>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="clinical">Clinical</SelectItem>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Start Date</Label>
                      <Input
                        type="date"
                        value={reportForm.date_range_start}
                        onChange={(e) => setReportForm({ ...reportForm, date_range_start: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">End Date</Label>
                      <Input
                        type="date"
                        value={reportForm.date_range_end}
                        onChange={(e) => setReportForm({ ...reportForm, date_range_end: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Schedule Report</Label>
                      <input
                        type="checkbox"
                        checked={reportForm.is_scheduled}
                        onChange={(e) => setReportForm({ ...reportForm, is_scheduled: e.target.checked })}
                        className="mt-1"
                      />
                    </div>
                    {reportForm.is_scheduled && (
                      <div>
                        <Label className="text-xs font-bold">Schedule Frequency</Label>
                        <Select
                          value={reportForm.schedule_frequency}
                          onValueChange={(value) => setReportForm({ ...reportForm, schedule_frequency: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleGenerateReport} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Generate Report
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total Reports</span>
                <FileText className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{totalReports}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">All time</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Scheduled</span>
                <Calendar className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{scheduledReports}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Auto-generated</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Financial Reports</span>
                <DollarSign className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{financialReports}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Revenue & costs</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Recent (7d)</span>
                <Clock className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{recentReports}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Generated this week</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Reports
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-2" /> Financial Analytics
            </TabsTrigger>
            <TabsTrigger value="operational" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Operational Analytics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Revenue trend chart placeholder - Integrate with your charting library
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#00c875]" /> Patient Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Patient growth chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#a25ddc]" /> Service Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Service utilization chart placeholder
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-[#0073ea]" /> Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Revenue breakdown pie chart placeholder
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search reports..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${getReportTypeColor(report.report_type)} text-white flex items-center justify-center`}>
                          {getReportTypeIcon(report.report_type)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{report.report_name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">
                            {new Date(report.generated_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {report.is_scheduled && (
                        <Badge className="bg-[#a25ddc] text-white text-[10px]">Scheduled</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Type</span>
                      <Badge variant="outline" className="text-[10px]">{report.report_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Category</span>
                      <Badge className={getCategoryColor(report.report_category) + " text-[10px]"}>
                        {report.report_category}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Date Range</span>
                      <span className="font-bold">
                        {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {report.recipients.length} recipients
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Financial Analytics Tab */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#0073ea]" /> Revenue by Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Revenue by service chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Cost Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Cost analysis chart placeholder
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-[#0073ea]" /> Profit Margin Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Profit margin trend chart placeholder
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operational Analytics Tab */}
          <TabsContent value="operational" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#0073ea]" /> Patient Flow Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Patient flow metrics chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#0073ea]" /> Staff Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Staff performance chart placeholder
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#0073ea]" /> Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Resource utilization chart placeholder
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsReporting;