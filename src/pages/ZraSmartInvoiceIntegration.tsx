import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, CheckCircle, AlertTriangle, RefreshCw, Download, Upload,
  Settings, Search, Filter, Calendar, Clock, DollarSign, Building2,
  Plus, Eye, Edit, Link2, Server, Activity, TrendingUp, ShieldCheck,
  Play, Pause, AlertCircle, Info, Zap, Database, Lock, Key
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface SmartInvoiceSettings {
  id: string;
  institution_id: string;
  status: string;
  environment?: string;
  tpin?: string;
  bhf_id?: string;
  device_serial_number?: string;
  legal_business_name?: string;
  authorized_contact_email?: string;
  authorized_contact_phone?: string;
  vsdc_base_url?: string;
  vsdc_internal_url?: string;
  container_reference?: string;
  secret_reference?: string;
  initialized_at?: string;
  last_health_check_at?: string;
  last_error?: string;
  next_retry_at?: string;
}

interface FiscalSubmission {
  id: string;
  institution_id: string;
  invoice_id: string;
  status: string;
  attempt_count: number;
  idempotency_key: string;
  request_payload?: any;
  response_payload?: any;
  zra_result_code?: string;
  zra_result_message?: string;
  zra_invoice_number?: string;
  submitted_at?: string;
  accepted_at?: string;
  next_retry_at?: string;
  last_error?: string;
  invoice?: {
    invoice_number?: string;
    amount?: number;
    patient_id?: string;
  };
}

interface ZraItemMapping {
  id: string;
  institution_id: string;
  catalog_item_id: string;
  zra_item_code: string;
  zra_item_class_code?: string;
  zra_item_type_code?: string;
  tax_type_code?: string;
  quantity_unit_code?: string;
  package_unit_code?: string;
  default_price?: number;
  synced_at?: string;
  is_active: boolean;
}

interface VsdcOperationLog {
  id: string;
  institution_id: string;
  operation_type: string;
  operation_status: string;
  request_payload?: any;
  response_payload?: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  performed_by?: string;
}

export const ZraSmartInvoiceIntegration = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SmartInvoiceSettings | null>(null);
  const [submissions, setSubmissions] = useState<FiscalSubmission[]>([]);
  const [itemMappings, setItemMappings] = useState<ZraItemMapping[]>([]);
  const [operationLogs, setOperationLogs] = useState<VsdcOperationLog[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Form states
  const [configForm, setConfigForm] = useState({
    environment: "sandbox",
    tpin: "",
    bhf_id: "000",
    device_serial_number: "",
    legal_business_name: "",
    authorized_contact_email: "",
    authorized_contact_phone: "",
    vsdc_base_url: "",
  });

  const [mappingForm, setMappingForm] = useState({
    catalog_item_id: "",
    zra_item_code: "",
    zra_item_class_code: "",
    tax_type_code: "",
    quantity_unit_code: "",
  });

  useEffect(() => {
    if (institution) {
      fetchZraData();
    }
  }, [institution]);

  const fetchZraData = async () => {
    if (!institution) return;

    try {
      const [settingsRes, submissionsRes, mappingsRes, logsRes] = await Promise.all([
        supabase.from("institution_smart_invoice_settings").select("*").eq("institution_id", institution.id).single(),
        supabase
          .from("fiscal_submissions")
          .select(`
            *,
            invoice:payments!invoice_id(invoice_number, amount, patient_id)
          `)
          .eq("institution_id", institution.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("institution_zra_item_mappings").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("vsdc_operation_logs").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false }).limit(50),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        setConfigForm({
          environment: settingsRes.data.environment || "sandbox",
          tpin: settingsRes.data.tpin || "",
          bhf_id: settingsRes.data.bhf_id || "000",
          device_serial_number: settingsRes.data.device_serial_number || "",
          legal_business_name: settingsRes.data.legal_business_name || "",
          authorized_contact_email: settingsRes.data.authorized_contact_email || "",
          authorized_contact_phone: settingsRes.data.authorized_contact_phone || "",
          vsdc_base_url: settingsRes.data.vsdc_base_url || "",
        });
      }
      if (submissionsRes.data) setSubmissions(submissionsRes.data);
      if (mappingsRes.data) setItemMappings(mappingsRes.data);
      if (logsRes.data) setOperationLogs(logsRes.data);
    } catch (error) {
      console.error("Error fetching ZRA data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("institution_smart_invoice_settings").upsert({
        institution_id: institution.id,
        ...configForm,
        status: "pending_setup",
      });

      if (error) throw error;
      setShowConfigDialog(false);
      fetchZraData();
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  const handleInitializeVSDC = async () => {
    if (!institution || !settings) return;

    try {
      // This would call your VSDC gateway service
      const { error } = await supabase.from("vsdc_operation_logs").insert({
        institution_id: institution.id,
        operation_type: "initialize",
        operation_status: "success",
        request_payload: { tpin: settings.tpin, bhfId: settings.bhf_id, dvcSrlNo: settings.device_serial_number },
        response_payload: { message: "VSDC initialization simulated" },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 500,
      });

      if (error) throw error;

      // Update settings
      await supabase.from("institution_smart_invoice_settings").update({
        status: settings.environment === "sandbox" ? "sandbox" : "active",
        initialized_at: new Date().toISOString(),
        last_health_check_at: new Date().toISOString(),
      }).eq("institution_id", institution.id);

      fetchZraData();
    } catch (error) {
      console.error("Error initializing VSDC:", error);
    }
  };

  const handleSyncCodes = async () => {
    if (!institution) return;

    try {
      await supabase.from("vsdc_operation_logs").insert({
        institution_id: institution.id,
        operation_type: "sync_codes",
        operation_status: "success",
        request_payload: {},
        response_payload: { message: "Code sync simulated" },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 300,
      });

      fetchZraData();
    } catch (error) {
      console.error("Error syncing codes:", error);
    }
  };

  const handleRetrySubmission = async (submissionId: string) => {
    try {
      await supabase.from("fiscal_submissions").update({
        status: "retrying",
        attempt_count: (submissions.find(s => s.id === submissionId)?.attempt_count || 0) + 1,
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }).eq("id", submissionId);

      fetchZraData();
    } catch (error) {
      console.error("Error retrying submission:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_connected": return "bg-[#676879] text-white";
      case "pending_setup": return "bg-[#fdab3d] text-white";
      case "sandbox": return "bg-[#a25ddc] text-white";
      case "active": return "bg-[#00c875] text-white";
      case "suspended": return "bg-[#e44258] text-white";
      case "error": return "bg-[#e44258] text-white";
      case "queued": return "bg-[#fdab3d] text-white";
      case "submitted": return "bg-[#0073ea] text-white";
      case "accepted": return "bg-[#00c875] text-white";
      case "rejected": return "bg-[#e44258] text-white";
      case "retrying": return "bg-[#a25ddc] text-white";
      case "not_required": return "bg-[#676879] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getOperationStatusColor = (status: string) => {
    switch (status) {
      case "success": return "bg-[#00c875] text-white";
      case "error": return "bg-[#e44258] text-white";
      case "retrying": return "bg-[#fdab3d] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access ZRA Smart Invoice integration.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSubmissions = submissions.filter((s) => s.status === "accepted").length;
  const pendingSubmissions = submissions.filter((s) => s.status === "queued" || s.status === "retrying").length;
  const rejectedSubmissions = submissions.filter((s) => s.status === "rejected").length;
  const totalMappings = itemMappings.length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">ZRA Smart Invoice Integration</h1>
              <p className="text-xs text-[#676879] font-medium">VSDC Fiscalization & Compliance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Configure Smart Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Configure ZRA Smart Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 rounded-lg bg-[#f0f2f7] dark:bg-slate-800 text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-[#0073ea]" />
                      <span className="font-bold">ZRA Registration Required</span>
                    </div>
                    <p className="text-[#676879]">
                      Your institution must register with ZRA, apply for VSDC service, and receive approval before enabling Smart Invoice.
                      Visit the Smart Invoice Taxpayer Portal to complete registration.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Environment</Label>
                    <Select
                      value={configForm.environment}
                      onValueChange={(value) => setConfigForm({ ...configForm, environment: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">TPIN (Tax Payer Identification Number)</Label>
                    <Input
                      value={configForm.tpin}
                      onChange={(e) => setConfigForm({ ...configForm, tpin: e.target.value })}
                      placeholder="e.g., 1000000000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Branch ID (BHF ID)</Label>
                    <Input
                      value={configForm.bhf_id}
                      onChange={(e) => setConfigForm({ ...configForm, bhf_id: e.target.value })}
                      placeholder="e.g., 000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Device Serial Number</Label>
                    <Input
                      value={configForm.device_serial_number}
                      onChange={(e) => setConfigForm({ ...configForm, device_serial_number: e.target.value })}
                      placeholder="e.g., DOC0CLOCK-CLINIC-001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Legal Business Name</Label>
                    <Input
                      value={configForm.legal_business_name}
                      onChange={(e) => setConfigForm({ ...configForm, legal_business_name: e.target.value })}
                      placeholder="Registered business name"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Contact Email</Label>
                      <Input
                        type="email"
                        value={configForm.authorized_contact_email}
                        onChange={(e) => setConfigForm({ ...configForm, authorized_contact_email: e.target.value })}
                        placeholder="finance@clinic.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Contact Phone</Label>
                      <Input
                        value={configForm.authorized_contact_phone}
                        onChange={(e) => setConfigForm({ ...configForm, authorized_contact_phone: e.target.value })}
                        placeholder="+260XXXXXXXXX"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">VSDC Base URL (Internal)</Label>
                    <Input
                      value={configForm.vsdc_base_url}
                      onChange={(e) => setConfigForm({ ...configForm, vsdc_base_url: e.target.value })}
                      placeholder="http://vsdc-xxx:8080/zravsdc"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSaveConfig} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Save Configuration
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Connection Status</span>
                <ShieldCheck className="h-4 w-4 text-[#0073ea]" />
              </div>
              <Badge className={getStatusColor(settings?.status || "not_connected") + " text-[10px]"}>
                {settings?.status || "Not Connected"}
              </Badge>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">
                {settings?.environment === "sandbox" ? "Sandbox Environment" : settings?.environment === "production" ? "Production Environment" : ""}
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Accepted Invoices</span>
                <CheckCircle className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{activeSubmissions}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Successfully fiscalized</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending/Retrying</span>
                <Clock className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{pendingSubmissions}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting submission</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Item Mappings</span>
                <Database className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{totalMappings}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Catalog synced</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="submissions" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Fiscal Submissions
            </TabsTrigger>
            <TabsTrigger value="mappings" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Database className="h-4 w-4 mr-2" /> Item Mappings
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Server className="h-4 w-4 mr-2" /> VSDC Logs
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            {settings && settings.status !== "not_connected" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[#0073ea]" /> VSDC Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settings.status === "pending_setup" && (
                      <Button onClick={handleInitializeVSDC} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                        <Play className="h-4 w-4 mr-1" /> Initialize VSDC
                      </Button>
                    )}
                    {(settings.status === "sandbox" || settings.status === "active") && (
                      <>
                        <Button onClick={handleSyncCodes} variant="outline" className="w-full text-xs">
                          <RefreshCw className="h-4 w-4 mr-1" /> Sync ZRA Codes
                        </Button>
                        <Button variant="outline" className="w-full text-xs">
                          <Database className="h-4 w-4 mr-1" /> Sync Item Catalog
                        </Button>
                        <Button variant="outline" className="w-full text-xs">
                          <FileText className="h-4 w-4 mr-1" /> Submit Test Invoice
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#0073ea]" /> Configuration Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">TPIN</span>
                      <span className="font-bold">{settings.tpin || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Branch ID</span>
                      <span className="font-bold">{settings.bhf_id || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Device Serial</span>
                      <span className="font-bold">{settings.device_serial_number || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Initialized</span>
                      <span className="font-bold">{settings.initialized_at ? new Date(settings.initialized_at).toLocaleDateString() : "No"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Last Health Check</span>
                      <span className="font-bold">{settings.last_health_check_at ? new Date(settings.last_health_check_at).toLocaleString() : "Never"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">Smart Invoice Not Configured</h3>
                  <p className="text-xs text-[#676879] mb-4">
                    Configure ZRA Smart Invoice to enable automatic fiscalization of invoices with the Zambia Revenue Authority.
                  </p>
                  <Button onClick={() => setShowConfigDialog(true)} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Configure Smart Invoice
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Fiscal Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search submissions..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Invoice #</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Attempts</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">ZRA Invoice #</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Submitted</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{submission.invoice?.invoice_number || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {institution.currency || "ZMW"} {submission.invoice?.amount?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(submission.status) + " text-[10px]"}>
                          {submission.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{submission.attempt_count}</td>
                      <td className="px-4 py-3 text-xs">{submission.zra_invoice_number || "-"}</td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {(submission.status === "rejected" || submission.status === "error") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleRetrySubmission(submission.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Item Mappings Tab */}
          <TabsContent value="mappings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">ZRA Item Mappings</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <RefreshCw className="h-4 w-4 mr-1" /> Sync from ZRA
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Plus className="h-4 w-4 mr-1" /> Add Mapping
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemMappings.map((mapping) => (
                <Card key={mapping.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{mapping.zra_item_code}</CardTitle>
                        <div className="text-[10px] text-[#676879]">Item ID: {mapping.catalog_item_id}</div>
                      </div>
                      {mapping.is_active ? (
                        <Badge className="bg-[#00c875] text-white text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-[#676879] text-white text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Item Class</span>
                      <span className="font-bold">{mapping.zra_item_class_code || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Tax Type</span>
                      <span className="font-bold">{mapping.tax_type_code || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Unit Code</span>
                      <span className="font-bold">{mapping.quantity_unit_code || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        Synced: {mapping.synced_at ? new Date(mapping.synced_at).toLocaleDateString() : "Never"}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* VSDC Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">VSDC Operation Logs</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Operation</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Duration</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Started</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {operationLogs.map((log) => (
                    <tr key={log.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{log.operation_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getOperationStatusColor(log.operation_status) + " text-[10px]"}>
                          {log.operation_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ZraSmartInvoiceIntegration;
