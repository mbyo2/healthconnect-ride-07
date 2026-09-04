import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, DollarSign, TrendingUp, Plus, Search, Filter, Download,
  Settings, Eye, Edit, Trash2, Calendar, Clock, Building2, AlertTriangle,
  CheckCircle, BarChart3, FileText, RefreshCw, ArrowUpRight, ArrowDownRight
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
import { Textarea } from "@/components/ui/textarea";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface GeneralLedgerEntry {
  id: string;
  institution_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  reference_number?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  currency: string;
  account_code: string;
  account_name: string;
  cost_center?: string;
  created_by?: string;
  posted_at?: string;
  is_posted: boolean;
  fiscal_year: number;
  fiscal_period: number;
}

interface AssetRecord {
  id: string;
  institution_id: string;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  purchase_date: string;
  purchase_cost: number;
  currency: string;
  depreciation_method: string;
  useful_life_years: number;
  salvage_value: number;
  accumulated_depreciation: number;
  net_book_value: number;
  current_depreciation_year: number;
  location?: string;
  assigned_to?: string;
  status: string;
  last_depreciation_date?: string;
}

interface BankReconciliation {
  id: string;
  institution_id: string;
  bank_account_id: string;
  bank_name: string;
  account_number: string;
  currency: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  variance: number;
  reconciliation_status: string;
  reconciled_by?: string;
  reconciled_at?: string;
  unreconciled_items: any[];
  notes?: string;
}

export const EnterpriseAccounting = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [glEntries, setGlEntries] = useState<GeneralLedgerEntry[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [showGlDialog, setShowGlDialog] = useState(false);
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);

  // Form states
  const [glForm, setGlForm] = useState({
    entry_type: "journal",
    reference_number: "",
    description: "",
    debit_amount: 0,
    credit_amount: 0,
    currency: "ZMW",
    account_code: "",
    account_name: "",
    cost_center: "",
  });

  const [assetForm, setAssetForm] = useState({
    asset_code: "",
    asset_name: "",
    asset_category: "medical_equipment",
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: 0,
    currency: "ZMW",
    depreciation_method: "straight_line",
    useful_life_years: 5,
    salvage_value: 0,
    location: "",
    assigned_to: "",
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    bank_account_id: "",
    bank_name: "",
    account_number: "",
    currency: "ZMW",
    statement_date: new Date().toISOString().split('T')[0],
    statement_balance: 0,
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchAccountingData();
    }
  }, [institution]);

  const fetchAccountingData = async () => {
    if (!institution) return;

    try {
      const [glRes, assetsRes, reconciliationsRes] = await Promise.all([
        supabase.from("general_ledger_entries").select("*").eq("institution_id", institution.id).order("entry_date", { ascending: false }).limit(50),
        supabase.from("asset_records").select("*").eq("institution_id", institution.id).order("purchase_date", { ascending: false }).limit(50),
        supabase.from("bank_reconciliations").select("*").eq("institution_id", institution.id).order("statement_date", { ascending: false }).limit(50),
      ]);

      if (glRes.data) setGlEntries(glRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
      if (reconciliationsRes.data) setReconciliations(reconciliationsRes.data);
    } catch (error) {
      console.error("Error fetching accounting data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlEntry = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("general_ledger_entries").insert({
        institution_id: institution.id,
        entry_number: `GL-${Date.now()}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        ...glForm,
        is_posted: false,
        fiscal_year: new Date().getFullYear(),
        fiscal_period: Math.ceil((new Date().getMonth() + 1) / 3),
      });

      if (error) throw error;
      setShowGlDialog(false);
      fetchAccountingData();
    } catch (error) {
      console.error("Error creating GL entry:", error);
    }
  };

  const handleCreateAsset = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("asset_records").insert({
        institution_id: institution.id,
        ...assetForm,
        accumulated_depreciation: 0,
        net_book_value: assetForm.purchase_cost,
        current_depreciation_year: 1,
        status: "active",
      });

      if (error) throw error;
      setShowAssetDialog(false);
      fetchAccountingData();
    } catch (error) {
      console.error("Error creating asset:", error);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("bank_reconciliations").insert({
        institution_id: institution.id,
        ...reconciliationForm,
        book_balance: 0,
        variance: 0,
        reconciliation_status: "pending",
        unreconciled_items: [],
      });

      if (error) throw error;
      setShowReconciliationDialog(false);
      fetchAccountingData();
    } catch (error) {
      console.error("Error creating reconciliation:", error);
    }
  };

  const getEntryTypeColor = (type: string) => {
    switch (type) {
      case "journal": return "bg-[#0073ea]";
      case "receipt": return "bg-[#00c875]";
      case "payment": return "bg-[#e44258]";
      case "adjustment": return "bg-[#fdab3d]";
      default: return "bg-[#676879]";
    }
  };

  const getDepreciationMethodLabel = (method: string) => {
    switch (method) {
      case "straight_line": return "Straight Line";
      case "declining_balance": return "Declining Balance";
      case "units_of_production": return "Units of Production";
      default: return method;
    }
  };

  const getReconciliationStatusColor = (status: string) => {
    switch (status) {
      case "reconciled": return "bg-[#00c875] text-white";
      case "pending": return "bg-[#fdab3d] text-white";
      case "variance": return "bg-[#e44258] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access enterprise accounting.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAssets = assets.reduce((sum, a) => sum + a.purchase_cost, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);
  const netBookValue = totalAssets - totalDepreciation;
  const pendingReconciliations = reconciliations.filter((r) => r.reconciliation_status !== "reconciled").length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Enterprise Accounting</h1>
              <p className="text-xs text-[#676879] font-medium">General Ledger, Asset Management & Bank Reconciliation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showGlDialog} onOpenChange={setShowGlDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New GL Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create General Ledger Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Entry Type</Label>
                    <Select
                      value={glForm.entry_type}
                      onValueChange={(value) => setGlForm({ ...glForm, entry_type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="journal">Journal Entry</SelectItem>
                        <SelectItem value="receipt">Receipt</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Reference Number</Label>
                    <Input
                      value={glForm.reference_number}
                      onChange={(e) => setGlForm({ ...glForm, reference_number: e.target.value })}
                      placeholder="e.g., INV-001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={glForm.description}
                      onChange={(e) => setGlForm({ ...glForm, description: e.target.value })}
                      placeholder="Entry description..."
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Debit Amount</Label>
                      <Input
                        type="number"
                        value={glForm.debit_amount}
                        onChange={(e) => setGlForm({ ...glForm, debit_amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Credit Amount</Label>
                      <Input
                        type="number"
                        value={glForm.credit_amount}
                        onChange={(e) => setGlForm({ ...glForm, credit_amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Currency</Label>
                      <Select
                        value={glForm.currency}
                        onValueChange={(value) => setGlForm({ ...glForm, currency: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ZMW">ZMW</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Cost Center</Label>
                      <Input
                        value={glForm.cost_center}
                        onChange={(e) => setGlForm({ ...glForm, cost_center: e.target.value })}
                        placeholder="e.g., CC-001"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Account Code</Label>
                      <Input
                        value={glForm.account_code}
                        onChange={(e) => setGlForm({ ...glForm, account_code: e.target.value })}
                        placeholder="e.g., 1000"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Account Name</Label>
                      <Input
                        value={glForm.account_name}
                        onChange={(e) => setGlForm({ ...glForm, account_name: e.target.value })}
                        placeholder="e.g., Cash"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateGlEntry} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create GL Entry
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total Assets</span>
                <BookOpen className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">
                {institution.currency || "ZMW"} {(totalAssets / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Gross asset value</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Accumulated Depreciation</span>
                <TrendingUp className="h-4 w-4 text-[#e44258]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#e44258]">
                {institution.currency || "ZMW"} {(totalDepreciation / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Total depreciation</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Net Book Value</span>
                <DollarSign className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">
                {institution.currency || "ZMW"} {(netBookValue / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Current asset value</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Reconciliations</span>
                <AlertTriangle className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{pendingReconciliations}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting reconciliation</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gl" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="gl" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BookOpen className="h-4 w-4 mr-2" /> General Ledger
            </TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Asset Management
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <RefreshCw className="h-4 w-4 mr-2" /> Bank Reconciliation
            </TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <ArrowUpRight className="h-4 w-4 mr-2" /> ERP Integration
            </TabsTrigger>
          </TabsList>

          {/* General Ledger Tab */}
          <TabsContent value="gl" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search entries..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="journal">Journal</SelectItem>
                    <SelectItem value="receipt">Receipt</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Entry #</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Date</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Type</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Account</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Debit</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Credit</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Currency</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {glEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{entry.entry_number}</div>
                        <div className="text-[10px] text-[#676879]">{entry.reference_number}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`h-6 w-6 rounded-lg ${getEntryTypeColor(entry.entry_type)} text-white flex items-center justify-center`}>
                          <BookOpen className="h-3 w-3" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{entry.account_name}</div>
                        <div className="text-[10px] text-[#676879]">{entry.account_code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#00c875]">
                        {entry.debit_amount > 0 ? `${entry.currency} ${entry.debit_amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#e44258]">
                        {entry.credit_amount > 0 ? `${entry.currency} ${entry.credit_amount.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs">{entry.currency}</td>
                      <td className="px-4 py-3">
                        {entry.is_posted ? (
                          <Badge className="bg-[#00c875] text-white text-[10px]">Posted</Badge>
                        ) : (
                          <Badge className="bg-[#fdab3d] text-white text-[10px]">Draft</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Asset Management Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search assets..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="medical_equipment">Medical Equipment</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="vehicles">Vehicles</SelectItem>
                    <SelectItem value="buildings">Buildings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                      <Plus className="h-4 w-4 mr-1" /> Add Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-extrabold">Add Fixed Asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold">Asset Code</Label>
                          <Input
                            value={assetForm.asset_code}
                            onChange={(e) => setAssetForm({ ...assetForm, asset_code: e.target.value })}
                            placeholder="e.g., AST-001"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Asset Name</Label>
                          <Input
                            value={assetForm.asset_name}
                            onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })}
                            placeholder="e.g., X-Ray Machine"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Category</Label>
                        <Select
                          value={assetForm.asset_category}
                          onValueChange={(value) => setAssetForm({ ...assetForm, asset_category: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medical_equipment">Medical Equipment</SelectItem>
                            <SelectItem value="furniture">Furniture</SelectItem>
                            <SelectItem value="vehicles">Vehicles</SelectItem>
                            <SelectItem value="buildings">Buildings</SelectItem>
                            <SelectItem value="it_equipment">IT Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold">Purchase Date</Label>
                          <Input
                            type="date"
                            value={assetForm.purchase_date}
                            onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Purchase Cost</Label>
                          <Input
                            type="number"
                            value={assetForm.purchase_cost}
                            onChange={(e) => setAssetForm({ ...assetForm, purchase_cost: parseFloat(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold">Depreciation Method</Label>
                          <Select
                            value={assetForm.depreciation_method}
                            onValueChange={(value) => setAssetForm({ ...assetForm, depreciation_method: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="straight_line">Straight Line</SelectItem>
                              <SelectItem value="declining_balance">Declining Balance</SelectItem>
                              <SelectItem value="units_of_production">Units of Production</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Useful Life (Years)</Label>
                          <Input
                            type="number"
                            value={assetForm.useful_life_years}
                            onChange={(e) => setAssetForm({ ...assetForm, useful_life_years: parseInt(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Salvage Value</Label>
                        <Input
                          type="number"
                          value={assetForm.salvage_value}
                          onChange={(e) => setAssetForm({ ...assetForm, salvage_value: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleCreateAsset} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                        Add Asset
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.map((asset) => (
                <Card key={asset.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{asset.asset_name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">{asset.asset_code}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{asset.asset_category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[#676879]">Purchase Cost</div>
                        <div className="text-sm font-bold">{asset.currency} {asset.purchase_cost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#676879]">Net Book Value</div>
                        <div className="text-sm font-bold text-[#00c875]">{asset.currency} {asset.net_book_value.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Depreciation Method</span>
                      <span className="font-bold">{getDepreciationMethodLabel(asset.depreciation_method)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Accumulated Depreciation</span>
                      <span className="font-bold text-[#e44258]">{asset.currency} {asset.accumulated_depreciation.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        Year {asset.current_depreciation_year} of {asset.useful_life_years}
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

          {/* Bank Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search reconciliations..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="variance">Variance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                      <Plus className="h-4 w-4 mr-1" /> New Reconciliation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-extrabold">Start Bank Reconciliation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label className="text-xs font-bold">Bank Name</Label>
                        <Input
                          value={reconciliationForm.bank_name}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, bank_name: e.target.value })}
                          placeholder="e.g., Zanaco"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Account Number</Label>
                        <Input
                          value={reconciliationForm.account_number}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, account_number: e.target.value })}
                          placeholder="e.g., 1234567890"
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-bold">Currency</Label>
                          <Select
                            value={reconciliationForm.currency}
                            onValueChange={(value) => setReconciliationForm({ ...reconciliationForm, currency: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ZMW">ZMW</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-bold">Statement Date</Label>
                          <Input
                            type="date"
                            value={reconciliationForm.statement_date}
                            onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_date: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Statement Balance</Label>
                        <Input
                          type="number"
                          value={reconciliationForm.statement_balance}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, statement_balance: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Notes</Label>
                        <Textarea
                          value={reconciliationForm.notes}
                          onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                          placeholder="Reconciliation notes..."
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleCreateReconciliation} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                        Start Reconciliation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reconciliations.map((reconciliation) => (
                <Card key={reconciliation.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{reconciliation.bank_name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">{reconciliation.account_number}</div>
                      </div>
                      <Badge className={getReconciliationStatusColor(reconciliation.reconciliation_status) + " text-[10px]"}>
                        {reconciliation.reconciliation_status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[#676879]">Statement Balance</div>
                        <div className="text-sm font-bold">{reconciliation.currency} {reconciliation.statement_balance.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#676879]">Book Balance</div>
                        <div className="text-sm font-bold">{reconciliation.currency} {reconciliation.book_balance.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Variance</span>
                      <span className={`font-bold ${reconciliation.variance !== 0 ? "text-[#e44258]" : "text-[#00c875]"}`}>
                        {reconciliation.currency} {reconciliation.variance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {new Date(reconciliation.statement_date).toLocaleDateString()}
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ERP Integration Tab */}
          <TabsContent value="integration" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-[#0073ea]" /> External ERP Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-[#676879] text-xs">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                        <div className="text-sm font-bold mb-1">SAP</div>
                        <div className="text-[10px]">Enterprise ERP</div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                        <div className="text-sm font-bold mb-1">Focus ERP</div>
                        <div className="text-[10px]">Mid-market ERP</div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                        <div className="text-sm font-bold mb-1">Tally</div>
                        <div className="text-[10px]">Accounting Software</div>
                      </div>
                    </div>
                    <div className="text-xs">
                      Sync financial vouchers with external accounting systems via API integration
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnterpriseAccounting;