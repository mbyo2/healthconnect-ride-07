import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, DollarSign, AlertTriangle, CheckCircle, TrendingUp,
  Settings, Eye, Download, Filter, Search, Calendar, FileText,
  Clock, User, Building2, ArrowUpRight, ArrowDownRight, RefreshCw, Plus
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

interface FinancialControl {
  id: string;
  institution_id: string;
  require_approval_for_amount_above: number;
  require_dual_authorization_above: number;
  auto_lock_amount_discrepancies: number;
  max_daily_refund_amount: number;
  require_prescription_for_controlled_substances: boolean;
  inventory_auto_reorder_threshold: number;
  enable_revenue_audit: boolean;
  fraud_detection_enabled: boolean;
}

interface RevenueAuditLog {
  id: string;
  institution_id: string;
  transaction_type: string;
  transaction_id?: string;
  original_amount?: number;
  adjusted_amount?: number;
  reason?: string;
  performed_by?: string;
  approved_by?: string;
  status: string;
  flagged_for_review: boolean;
  risk_score: number;
  created_at: string;
  reviewed_at?: string;
}

interface PriceDiscrepancyAlert {
  id: string;
  institution_id: string;
  transaction_type: string;
  expected_price: number;
  actual_price: number;
  difference_amount: number;
  difference_percentage: number;
  transaction_id?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export const FinancialControls = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<FinancialControl | null>(null);
  const [auditLogs, setAuditLogs] = useState<RevenueAuditLog[]>([]);
  const [discrepancies, setDiscrepancies] = useState<PriceDiscrepancyAlert[]>([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);

  // Form states
  const [controlForm, setControlForm] = useState({
    require_approval_for_amount_above: 1000,
    require_dual_authorization_above: 5000,
    auto_lock_amount_discrepancies: 100,
    max_daily_refund_amount: 500,
    require_prescription_for_controlled_substances: true,
    inventory_auto_reorder_threshold: 0.2,
    enable_revenue_audit: true,
    fraud_detection_enabled: true,
  });

  const [auditForm, setAuditForm] = useState({
    transaction_type: "payment",
    original_amount: 0,
    adjusted_amount: 0,
    reason: "",
  });

  useEffect(() => {
    if (institution) {
      fetchFinancialData();
    }
  }, [institution]);

  const fetchFinancialData = async () => {
    if (!institution) return;

    try {
      const [controlsRes, auditRes, discrepancyRes] = await Promise.all([
        supabase.from("financial_controls").select("*").eq("institution_id", institution.id).single(),
        supabase.from("revenue_audit_log").select("*").eq("institution_id", institution.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("price_discrepancy_alerts").select("*").eq("institution_id", institution.id).eq("resolved", false).order("created_at", { ascending: false }),
      ]);

      if (controlsRes.data) {
        setControls(controlsRes.data);
        setControlForm({
          require_approval_for_amount_above: controlsRes.data.require_approval_for_amount_above,
          require_dual_authorization_above: controlsRes.data.require_dual_authorization_above,
          auto_lock_amount_discrepancies: controlsRes.data.auto_lock_amount_discrepancies,
          max_daily_refund_amount: controlsRes.data.max_daily_refund_amount,
          require_prescription_for_controlled_substances: controlsRes.data.require_prescription_for_controlled_substances,
          inventory_auto_reorder_threshold: controlsRes.data.inventory_auto_reorder_threshold,
          enable_revenue_audit: controlsRes.data.enable_revenue_audit,
          fraud_detection_enabled: controlsRes.data.fraud_detection_enabled,
        });
      }

      if (auditRes.data) setAuditLogs(auditRes.data);
      if (discrepancyRes.data) setDiscrepancies(discrepancyRes.data);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveControls = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase
        .from("financial_controls")
        .upsert({
          institution_id: institution.id,
          ...controlForm,
        });

      if (error) throw error;
      setShowSettingsDialog(false);
      fetchFinancialData();
    } catch (error) {
      console.error("Error saving controls:", error);
    }
  };

  const handleCreateAudit = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("revenue_audit_log").insert({
        institution_id: institution.id,
        transaction_type: auditForm.transaction_type,
        original_amount: auditForm.original_amount,
        adjusted_amount: auditForm.adjusted_amount,
        reason: auditForm.reason,
        performed_by: (await supabase.auth.getUser()).data.user?.id,
        status: "pending",
        risk_score: Math.abs(auditForm.adjusted_amount - auditForm.original_amount) / auditForm.original_amount > 0.1 ? 0.8 : 0.5,
      });

      if (error) throw error;
      setShowAuditDialog(false);
      fetchFinancialData();
    } catch (error) {
      console.error("Error creating audit:", error);
    }
  };

  const handleResolveDiscrepancy = async (id: string) => {
    try {
      const { error } = await supabase
        .from("price_discrepancy_alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      fetchFinancialData();
    } catch (error) {
      console.error("Error resolving discrepancy:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-[#00c875] text-white";
      case "rejected": return "bg-[#e44258] text-white";
      case "flagged": return "bg-[#fdab3d] text-white";
      default: return "bg-[#0073ea] text-white";
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return "text-[#e44258]";
    if (score >= 0.5) return "text-[#fdab3d]";
    return "text-[#00c875]";
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
            <h2 className="text-xl font-extrabold">Institution Required</h2>
            <p className="text-xs text-[#676879]">Please select an institution to access financial controls.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const flaggedCount = auditLogs.filter((log) => log.flagged_for_review).length;
  const pendingCount = auditLogs.filter((log) => log.status === "pending").length;
  const totalDiscrepancyAmount = discrepancies.reduce((sum, d) => sum + d.difference_amount, 0);

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Financial Controls</h1>
              <p className="text-xs text-[#676879] font-medium">Revenue Leak Prevention & Audit Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Configure Controls
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Financial Control Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Approval Threshold</Label>
                      <Input
                        type="number"
                        value={controlForm.require_approval_for_amount_above}
                        onChange={(e) => setControlForm({ ...controlForm, require_approval_for_amount_above: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Dual Auth Threshold</Label>
                      <Input
                        type="number"
                        value={controlForm.require_dual_authorization_above}
                        onChange={(e) => setControlForm({ ...controlForm, require_dual_authorization_above: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Price Discrepancy Lock</Label>
                      <Input
                        type="number"
                        value={controlForm.auto_lock_amount_discrepancies}
                        onChange={(e) => setControlForm({ ...controlForm, auto_lock_amount_discrepancies: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Max Daily Refund</Label>
                      <Input
                        type="number"
                        value={controlForm.max_daily_refund_amount}
                        onChange={(e) => setControlForm({ ...controlForm, max_daily_refund_amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Inventory Reorder Threshold</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={controlForm.inventory_auto_reorder_threshold}
                      onChange={(e) => setControlForm({ ...controlForm, inventory_auto_reorder_threshold: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Require Prescription for Controlled Substances</Label>
                      <Switch
                        checked={controlForm.require_prescription_for_controlled_substances}
                        onCheckedChange={(checked) => setControlForm({ ...controlForm, require_prescription_for_controlled_substances: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Enable Revenue Audit</Label>
                      <Switch
                        checked={controlForm.enable_revenue_audit}
                        onCheckedChange={(checked) => setControlForm({ ...controlForm, enable_revenue_audit: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Enable Fraud Detection</Label>
                      <Switch
                        checked={controlForm.fraud_detection_enabled}
                        onCheckedChange={(checked) => setControlForm({ ...controlForm, fraud_detection_enabled: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveControls} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Save Settings
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Flagged Transactions</span>
                <AlertTriangle className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{flaggedCount}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Requires review</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Audits</span>
                <Clock className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{pendingCount}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting approval</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Price Discrepancies</span>
                <DollarSign className="h-4 w-4 text-[#e44258]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#e44258]">{discrepancies.length}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Unresolved</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total Discrepancy</span>
                <TrendingUp className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">
                {institution.currency || "ZMW"} {totalDiscrepancyAmount.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">At risk amount</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="audit" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Revenue Audit Log
            </TabsTrigger>
            <TabsTrigger value="discrepancies" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <AlertTriangle className="h-4 w-4 mr-2" /> Price Discrepancies
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <TrendingUp className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* Revenue Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search transactions..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                      <Plus className="h-4 w-4 mr-1" /> Manual Audit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-extrabold">Create Manual Audit Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-xs font-bold">Transaction Type</Label>
                        <Select
                          value={auditForm.transaction_type}
                          onValueChange={(value) => setAuditForm({ ...auditForm, transaction_type: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="payment">Payment</SelectItem>
                            <SelectItem value="refund">Refund</SelectItem>
                            <SelectItem value="adjustment">Adjustment</SelectItem>
                            <SelectItem value="write_off">Write Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold">Original Amount</Label>
                          <Input
                            type="number"
                            value={auditForm.original_amount}
                            onChange={(e) => setAuditForm({ ...auditForm, original_amount: parseFloat(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Adjusted Amount</Label>
                          <Input
                            type="number"
                            value={auditForm.adjusted_amount}
                            onChange={(e) => setAuditForm({ ...auditForm, adjusted_amount: parseFloat(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Reason</Label>
                        <Textarea
                          value={auditForm.reason}
                          onChange={(e) => setAuditForm({ ...auditForm, reason: e.target.value })}
                          placeholder="Explain the reason for this audit..."
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleCreateAudit} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                        Create Audit Entry
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Transaction</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Type</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Risk Score</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Created</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{log.transaction_id?.slice(0, 8)}...</div>
                        <div className="text-[10px] text-[#676879]">{log.reason || "No reason provided"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {log.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {institution.currency || "ZMW"} {log.adjusted_amount?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${getRiskColor(log.risk_score)}`}>
                          {(log.risk_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(log.status) + " text-[10px]"}>
                          {log.status}
                        </Badge>
                        {log.flagged_for_review && (
                          <Badge className="bg-[#fdab3d] text-white text-[10px] ml-1">Flagged</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(log.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {log.status === "pending" && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-500">
                              <CheckCircle className="h-3 w-3" />
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

          {/* Price Discrepancies Tab */}
          <TabsContent value="discrepancies" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search discrepancies..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discrepancies.map((discrepancy) => (
                <Card key={discrepancy.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-[#e44258]" />
                          {discrepancy.transaction_type} Discrepancy
                        </CardTitle>
                        <div className="text-[10px] text-[#676879] mt-1">
                          {new Date(discrepancy.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge className="bg-[#e44258] text-white text-[10px]">
                        {discrepancy.difference_percentage.toFixed(1)}% Diff
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[#676879]">Expected</div>
                        <div className="text-sm font-bold text-[#00c875]">
                          {institution.currency || "ZMW"} {discrepancy.expected_price.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#676879]">Actual</div>
                        <div className="text-sm font-bold text-[#e44258]">
                          {institution.currency || "ZMW"} {discrepancy.actual_price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs">
                        <span className="text-[#676879]">Difference: </span>
                        <span className="font-bold text-[#e44258]">
                          {institution.currency || "ZMW"} {discrepancy.difference_amount.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleResolveDiscrepancy(discrepancy.id)}
                        className="text-xs bg-[#00c875] hover:bg-[#00a562] text-white"
                      >
                        Resolve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Revenue Leak Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Analytics chart placeholder - Integrate with your charting library
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#0073ea]" /> Control Effectiveness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Approval Rate</span>
                      <span className="font-bold text-[#00c875]">94.2%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Fraud Detection</span>
                      <span className="font-bold text-[#0073ea]">87.5%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Auto-Lock Success</span>
                      <span className="font-bold text-[#a25ddc]">91.8%</span>
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

export default FinancialControls;