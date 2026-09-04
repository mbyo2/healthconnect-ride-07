import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, DollarSign, Package, Clock, Plus, Search, Filter,
  Download, Settings, Eye, Edit, Trash2, AlertTriangle, CheckCircle,
  TrendingUp, BarChart3, Calendar, UserRound, Building2
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

interface ClinicalProcedure {
  id: string;
  procedure_code: string;
  procedure_name: string;
  category: string;
  description?: string;
  base_price: number;
  duration_minutes?: number;
  requires_prior_authorization: boolean;
  requires_preparation: boolean;
  inventory_requirements: any[];
  staff_requirements: any[];
  equipment_requirements: any[];
  is_active: boolean;
}

interface InstitutionProcedurePricing {
  id: string;
  institution_id: string;
  procedure_id: string;
  price: number;
  currency: string;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  procedure?: ClinicalProcedure;
}

interface ProcedureExecution {
  id: string;
  procedure_id: string;
  patient_id: string;
  institution_id?: string;
  provider_id?: string;
  appointment_id?: string;
  execution_date: string;
  status: string;
  inventory_consumed: any[];
  staff_involved: any[];
  complications?: string;
  follow_up_required: boolean;
  notes?: string;
  procedure?: ClinicalProcedure;
  patient?: {
    first_name: string;
    last_name: string;
  };
}

export const ProcedureManagement = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [procedures, setProcedures] = useState<ClinicalProcedure[]>([]);
  const [pricing, setPricing] = useState<InstitutionProcedurePricing[]>([]);
  const [executions, setExecutions] = useState<ProcedureExecution[]>([]);
  const [showProcedureDialog, setShowProcedureDialog] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Form states
  const [procedureForm, setProcedureForm] = useState({
    procedure_code: "",
    procedure_name: "",
    category: "consultation",
    description: "",
    base_price: 0,
    duration_minutes: 30,
    requires_prior_authorization: false,
    requires_preparation: false,
  });

  const [pricingForm, setPricingForm] = useState({
    procedure_id: "",
    price: 0,
    currency: "USD",
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: "",
  });

  useEffect(() => {
    fetchProcedureData();
  }, [institution]);

  const fetchProcedureData = async () => {
    try {
      const [proceduresRes, pricingRes, executionsRes] = await Promise.all([
        supabase.from("clinical_procedures").select("*").eq("is_active", true).order("procedure_name"),
        institution 
          ? supabase
              .from("institution_procedure_pricing")
              .select(`
                *,
                procedure:clinical_procedures(*)
              `)
              .eq("institution_id", institution.id)
              .order("effective_from", { ascending: false })
          : Promise.resolve({ data: [] }),
        institution 
          ? supabase
              .from("procedure_executions")
              .select(`
                *,
                procedure:clinical_procedures(*),
                patient:profiles!patient_id(first_name, last_name)
              `)
              .eq("institution_id", institution.id)
              .order("execution_date", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] }),
      ]);

      if (proceduresRes.data) setProcedures(proceduresRes.data);
      if (pricingRes.data) setPricing(pricingRes.data);
      if (executionsRes.data) setExecutions(executionsRes.data);
    } catch (error) {
      console.error("Error fetching procedure data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcedure = async () => {
    try {
      const { error } = await supabase.from("clinical_procedures").insert({
        ...procedureForm,
        inventory_requirements: [],
        staff_requirements: [],
        equipment_requirements: [],
      });

      if (error) throw error;
      setShowProcedureDialog(false);
      fetchProcedureData();
    } catch (error) {
      console.error("Error creating procedure:", error);
    }
  };

  const handleSetPricing = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("institution_procedure_pricing").insert({
        institution_id: institution.id,
        ...pricingForm,
      });

      if (error) throw error;
      setShowPricingDialog(false);
      fetchProcedureData();
    } catch (error) {
      console.error("Error setting pricing:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "telemedicine": return "bg-[#0073ea]";
      case "consultation": return "bg-[#00c875]";
      case "laboratory": return "bg-[#a25ddc]";
      case "radiology": return "bg-[#fdab3d]";
      case "surgery": return "bg-[#e44258]";
      case "therapy": return "bg-[#6366f1]";
      default: return "bg-[#676879]";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-[#00c875] text-white";
      case "in_progress": return "bg-[#0073ea] text-white";
      case "scheduled": return "bg-[#a25ddc] text-white";
      case "complications": return "bg-[#e44258] text-white";
      case "cancelled": return "bg-[#676879] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  const totalProcedures = procedures.length;
  const activePricing = pricing.filter((p) => p.is_active).length;
  const recentExecutions = executions.filter((e) => {
    const executionDate = new Date(e.execution_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return executionDate > weekAgo;
  }).length;
  const avgProcedurePrice = procedures.length > 0 
    ? procedures.reduce((sum, p) => sum + p.base_price, 0) / procedures.length 
    : 0;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Procedure Management</h1>
              <p className="text-xs text-[#676879] font-medium">Clinical Procedures & Pricing Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showProcedureDialog} onOpenChange={setShowProcedureDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Procedure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Clinical Procedure</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Procedure Code</Label>
                    <Input
                      value={procedureForm.procedure_code}
                      onChange={(e) => setProcedureForm({ ...procedureForm, procedure_code: e.target.value })}
                      placeholder="e.g., TEL-001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Procedure Name</Label>
                    <Input
                      value={procedureForm.procedure_name}
                      onChange={(e) => setProcedureForm({ ...procedureForm, procedure_name: e.target.value })}
                      placeholder="e.g., Telemedicine Consultation"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Category</Label>
                    <Select
                      value={procedureForm.category}
                      onValueChange={(value) => setProcedureForm({ ...procedureForm, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="telemedicine">Telemedicine</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="laboratory">Laboratory</SelectItem>
                        <SelectItem value="radiology">Radiology</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="therapy">Therapy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Base Price</Label>
                      <Input
                        type="number"
                        value={procedureForm.base_price}
                        onChange={(e) => setProcedureForm({ ...procedureForm, base_price: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Duration (min)</Label>
                      <Input
                        type="number"
                        value={procedureForm.duration_minutes}
                        onChange={(e) => setProcedureForm({ ...procedureForm, duration_minutes: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={procedureForm.description}
                      onChange={(e) => setProcedureForm({ ...procedureForm, description: e.target.value })}
                      placeholder="Procedure description..."
                      className="mt-1"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Requires Prior Authorization</Label>
                      <Switch
                        checked={procedureForm.requires_prior_authorization}
                        onCheckedChange={(checked) => setProcedureForm({ ...procedureForm, requires_prior_authorization: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Requires Preparation</Label>
                      <Switch
                        checked={procedureForm.requires_preparation}
                        onCheckedChange={(checked) => setProcedureForm({ ...procedureForm, requires_preparation: checked })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateProcedure} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Procedure
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {institution && (
              <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-xs font-bold">
                    <DollarSign className="h-4 w-4 mr-1" /> Set Pricing
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-extrabold">Set Institution Pricing</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label className="text-xs font-bold">Procedure</Label>
                      <Select
                        value={pricingForm.procedure_id}
                        onValueChange={(value) => setPricingForm({ ...pricingForm, procedure_id: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select procedure" />
                        </SelectTrigger>
                        <SelectContent>
                          {procedures.map((proc) => (
                            <SelectItem key={proc.id} value={proc.id}>
                              {proc.procedure_name} ({proc.procedure_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold">Price</Label>
                        <Input
                          type="number"
                          value={pricingForm.price}
                          onChange={(e) => setPricingForm({ ...pricingForm, price: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Currency</Label>
                        <Select
                          value={pricingForm.currency}
                          onValueChange={(value) => setPricingForm({ ...pricingForm, currency: value })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="ZMW">ZMW</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold">Effective From</Label>
                        <Input
                          type="date"
                          value={pricingForm.effective_from}
                          onChange={(e) => setPricingForm({ ...pricingForm, effective_from: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Effective To (Optional)</Label>
                        <Input
                          type="date"
                          value={pricingForm.effective_to}
                          onChange={(e) => setPricingForm({ ...pricingForm, effective_to: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSetPricing} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                      Set Pricing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total Procedures</span>
                <Activity className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{totalProcedures}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">In catalog</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Pricing</span>
                <DollarSign className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">{activePricing}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Configured prices</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Recent Executions</span>
                <Clock className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{recentExecutions}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Past 7 days</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Avg Price</span>
                <TrendingUp className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">
                {institution?.currency || "ZMW"} {avgProcedurePrice.toFixed(0)}
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Per procedure</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="catalog" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" /> Procedure Catalog
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <DollarSign className="h-4 w-4 mr-2" /> Institution Pricing
            </TabsTrigger>
            <TabsTrigger value="executions" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Clock className="h-4 w-4 mr-2" /> Executions
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Package className="h-4 w-4 mr-2" /> Inventory Mapping
            </TabsTrigger>
          </TabsList>

          {/* Procedure Catalog Tab */}
          <TabsContent value="catalog" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search procedures..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="telemedicine">Telemedicine</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="laboratory">Laboratory</SelectItem>
                    <SelectItem value="radiology">Radiology</SelectItem>
                    <SelectItem value="surgery">Surgery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {procedures.map((procedure) => (
                <Card key={procedure.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${getCategoryColor(procedure.category)} text-white flex items-center justify-center`}>
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{procedure.procedure_name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">{procedure.procedure_code}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {procedure.requires_prior_authorization && (
                          <Badge className="bg-[#fdab3d] text-white text-[10px]">Auth Required</Badge>
                        )}
                        {procedure.requires_preparation && (
                          <Badge className="bg-[#a25ddc] text-white text-[10px]">Prep Required</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Category</span>
                      <Badge variant="outline" className="text-[10px]">{procedure.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Base Price</span>
                      <span className="font-bold">${procedure.base_price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Duration</span>
                      <span className="font-bold">{procedure.duration_minutes || 0} min</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {procedure.description?.slice(0, 50)}...
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Institution Pricing Tab */}
          <TabsContent value="pricing" className="space-y-4">
            {!institution ? (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">Institution Required</h3>
                  <p className="text-xs text-[#676879] mb-4">Select an institution to manage pricing</p>
                  <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Go to Institution Portal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search pricing..." className="w-64 h-9 text-xs" />
                    <Select defaultValue="active">
                      <SelectTrigger className="w-32 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="all">All Pricing</SelectItem>
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
                        <th className="text-left text-xs font-extrabold px-4 py-3">Procedure</th>
                        <th className="text-left text-xs font-extrabold px-4 py-3">Price</th>
                        <th className="text-left text-xs font-extrabold px-4 py-3">Currency</th>
                        <th className="text-left text-xs font-extrabold px-4 py-3">Effective From</th>
                        <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                        <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricing.map((price) => (
                        <tr key={price.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold">{price.procedure?.procedure_name}</div>
                            <div className="text-[10px] text-[#676879]">{price.procedure?.procedure_code}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">{price.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs">{price.currency}</td>
                          <td className="px-4 py-3 text-xs text-[#676879]">
                            {new Date(price.effective_from).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={price.is_active ? "bg-[#00c875] text-white text-[10px]" : "bg-[#676879] text-white text-[10px]"}>
                              {price.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Executions Tab */}
          <TabsContent value="executions" className="space-y-4">
            {!institution ? (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">Institution Required</h3>
                  <p className="text-xs text-[#676879] mb-4">Select an institution to view executions</p>
                  <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Go to Institution Portal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search executions..." className="w-64 h-9 text-xs" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="h-4 w-4 mr-1" /> Export
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executions.map((execution) => (
                    <Card key={execution.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                              <Activity className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-extrabold">{execution.procedure?.procedure_name}</CardTitle>
                              <div className="text-[10px] text-[#676879]">
                                {execution.patient?.first_name} {execution.patient?.last_name}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(execution.status) + " text-[10px]"}>
                            {execution.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#676879]">Execution Date</span>
                          <span className="font-bold">{new Date(execution.execution_date).toLocaleDateString()}</span>
                        </div>
                        {execution.complications && (
                          <div className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-[#e44258]" />
                            <span className="text-[#e44258] font-bold">Complications reported</span>
                          </div>
                        )}
                        {execution.follow_up_required && (
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="h-3 w-3 text-[#fdab3d]" />
                            <span className="text-[#fdab3d] font-bold">Follow-up required</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                          <div className="text-xs text-[#676879]">
                            {execution.staff_involved.length} staff involved
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* Inventory Mapping Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#0073ea]" /> Procedure-Inventory Mapping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                  Inventory mapping interface placeholder - Link procedures to inventory items
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProcedureManagement;