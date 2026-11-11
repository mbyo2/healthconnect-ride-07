import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Calculator, DollarSign, TrendingUp, Plus, Search, Filter, Download,
  Settings, Eye, Edit, Trash2, Calendar, Clock, Building2, Users,
  CheckCircle, AlertTriangle, BarChart3, FileText, RefreshCw
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { calculatePAYE } from "@/utils/zambiaPayroll";
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

interface PayeTaxSlab {
  id: string;
  institution_id: string;
  slab_name: string;
  min_income: number;
  max_income: number;
  tax_rate_percentage: number;
  fixed_amount: number;
  plus_percentage_above_min: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  description?: string;
}

interface PayeCalculation {
  id: string;
  institution_id: string;
  employee_id: string;
  calculation_month: string;
  gross_income: number;
  tax_exempt_amount: number;
  taxable_income: number;
  total_paye_tax: number;
  slab_applied: any[];
  calculated_at: string;
  calculated_by?: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

interface EmployeePayroll {
  id: string;
  institution_id: string;
  employee_id: string;
  month: string;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  gross_pay: number;
  paye_tax: number;
  napsa_employee: number;
  napsa_employer: number;
  nhima_employee: number;
  nhima_employer: number;
  net_pay: number;
  status: string;
  processed_at?: string;
  employee?: {
    first_name: string;
    last_name: string;
  };
}

export const PayeTaxCalculations = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [taxSlabs, setTaxSlabs] = useState<PayeTaxSlab[]>([]);
  const [calculations, setCalculations] = useState<PayeCalculation[]>([]);
  const [payroll, setPayroll] = useState<EmployeePayroll[]>([]);
  const [showSlabDialog, setShowSlabDialog] = useState(false);
  const [showCalcDialog, setShowCalcDialog] = useState(false);

  // Form states
  const [slabForm, setSlabForm] = useState({
    slab_name: "",
    min_income: 0,
    max_income: 0,
    tax_rate_percentage: 0,
    fixed_amount: 0,
    plus_percentage_above_min: 0,
    effective_from: new Date().toISOString().split('T')[0],
    description: "",
  });

  const [calcForm, setCalcForm] = useState({
    employee_id: "",
    gross_income: 0,
    tax_exempt_amount: 0,
    calculation_month: new Date().toISOString().slice(0, 7),
  });

  useEffect(() => {
    if (institution) {
      fetchPayeData();
    }
  }, [institution]);

  const fetchPayeData = async () => {
    if (!institution) return;

    try {
      const [slabsRes, calculationsRes, payrollRes] = await Promise.all([
        supabase.from("paye_tax_slabs").select("*").eq("institution_id", institution.id).order("min_income").limit(20),
        supabase
          .from("paye_calculations")
          .select(`
            *,
            employee:profiles!employee_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .order("calculation_month", { ascending: false })
          .limit(50),
        supabase
          .from("employee_payroll")
          .select(`
            *,
            employee:profiles!employee_id(first_name, last_name)
          `)
          .eq("institution_id", institution.id)
          .order("month", { ascending: false })
          .limit(50),
      ]);

      if (slabsRes.data) setTaxSlabs(slabsRes.data);
      if (calculationsRes.data) setCalculations(calculationsRes.data as any);
      if (payrollRes.data) setPayroll(payrollRes.data);
    } catch (error) {
      console.error("Error fetching PAYE data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlab = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("paye_tax_slabs").insert({
        institution_id: institution.id,
        ...slabForm,
        is_active: true,
      });

      if (error) throw error;
      setShowSlabDialog(false);
      fetchPayeData();
    } catch (error) {
      console.error("Error creating slab:", error);
    }
  };

  const handleCalculatePaye = async () => {
    if (!institution) return;

    const taxableIncome = Math.max(0, calcForm.gross_income - calcForm.tax_exempt_amount);
    let totalTax = 0;
    const slabApplied: any[] = [];
    let engine = "institution slabs";

    const sortedSlabs = [...taxSlabs].sort((a, b) => a.min_income - b.min_income);

    if (sortedSlabs.length === 0) {
      // No custom slabs configured: fall back to the verified statutory ZRA
      // bands — never record K0 tax as a calculated result.
      const paye = calculatePAYE(taxableIncome);
      totalTax = paye.total;
      engine = "zra-statutory";
      ([
        ["Band 1: K0–K5,100 @ 0%", paye.band1],
        ["Band 2: K5,101–K7,100 @ 20%", paye.band2],
        ["Band 3: K7,101–K9,200 @ 30%", paye.band3],
        ["Band 4: Above K9,200 @ 37%", paye.band4],
      ] as const).forEach(([slab_name, tax_calculated]) => {
        slabApplied.push({ slab_id: null, slab_name, tax_calculated });
      });
    } else {
      for (const slab of sortedSlabs) {
        if (taxableIncome > slab.min_income) {
          const taxableInSlab = Math.min(taxableIncome, slab.max_income || Infinity) - slab.min_income;
          const slabTax = slab.fixed_amount + (taxableInSlab * slab.plus_percentage_above_min / 100);
          totalTax += slabTax;
          slabApplied.push({
            slab_id: slab.id,
            slab_name: slab.slab_name,
            tax_calculated: slabTax,
          });
        }
      }
    }

    try {
      const { error } = await supabase.from("paye_calculations").insert({
        institution_id: institution.id,
        employee_id: calcForm.employee_id,
        calculation_month: calcForm.calculation_month,
        gross_income: calcForm.gross_income,
        tax_exempt_amount: calcForm.tax_exempt_amount,
        taxable_income: taxableIncome,
        total_paye_tax: totalTax,
        slab_applied: slabApplied,
        engine,
        calculated_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
      setShowCalcDialog(false);
      fetchPayeData();
    } catch (error) {
      console.error("Error calculating PAYE:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processed": return "bg-success-500 text-white";
      case "pending": return "bg-warning-500 text-white";
      case "failed": return "bg-error-500 text-white";
      default: return "bg-muted-foreground text-white";
    }
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-primary-500" />
            <h2 className="text-xl font-semibold">Institution Required</h2>
            <p className="text-xs text-muted-foreground">Please select an institution to access PAYE calculations.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-primary-500 hover:bg-primary-600">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSlabs = taxSlabs.filter((s) => s.is_active).length;
  const totalPayeCollected = calculations.reduce((sum, c) => sum + c.total_paye_tax, 0);
  const processedPayroll = payroll.filter((p) => p.status === "processed").length;
  const pendingPayroll = payroll.filter((p) => p.status === "pending").length;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="doc-page-header px-4 sm:px-6 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate">PAYE Tax Calculations</h1>
              <p className="text-xs text-muted-foreground font-medium truncate">Zambian Pay-As-You-Earn Tax Slabs & Payroll</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={showSlabDialog} onOpenChange={setShowSlabDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Tax Slab
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Add PAYE Tax Slab</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Slab Name</Label>
                    <Input
                      value={slabForm.slab_name}
                      onChange={(e) => setSlabForm({ ...slabForm, slab_name: e.target.value })}
                      placeholder="e.g., Band 1"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Min Income (ZMW)</Label>
                      <Input
                        type="number"
                        value={slabForm.min_income}
                        onChange={(e) => setSlabForm({ ...slabForm, min_income: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Max Income (ZMW)</Label>
                      <Input
                        type="number"
                        value={slabForm.max_income}
                        onChange={(e) => setSlabForm({ ...slabForm, max_income: parseFloat(e.target.value) })}
                        placeholder="0 for no limit"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Fixed Amount (ZMW)</Label>
                      <Input
                        type="number"
                        value={slabForm.fixed_amount}
                        onChange={(e) => setSlabForm({ ...slabForm, fixed_amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Plus % Above Min</Label>
                      <Input
                        type="number"
                        value={slabForm.plus_percentage_above_min}
                        onChange={(e) => setSlabForm({ ...slabForm, plus_percentage_above_min: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Effective From</Label>
                    <Input
                      type="date"
                      value={slabForm.effective_from}
                      onChange={(e) => setSlabForm({ ...slabForm, effective_from: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea
                      value={slabForm.description}
                      onChange={(e) => setSlabForm({ ...slabForm, description: e.target.value })}
                      placeholder="Slab description..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateSlab} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold">
                    Add Tax Slab
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCalcDialog} onOpenChange={setShowCalcDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-semibold min-h-[44px]">
                  <Calculator className="h-4 w-4 mr-1" /> Calculate PAYE
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Calculate PAYE Tax</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    {taxSlabs.length === 0
                      ? "No custom slabs configured — the verified ZRA 2024/25 statutory bands apply."
                      : `Applies this institution's ${taxSlabs.length} custom slab${taxSlabs.length === 1 ? "" : "s"}.`}
                  </p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-semibold">Employee</Label>
                    <Select
                      value={calcForm.employee_id}
                      onValueChange={(value) => setCalcForm({ ...calcForm, employee_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>No employees available yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Gross Income (ZMW)</Label>
                    <Input
                      type="number"
                      value={calcForm.gross_income}
                      onChange={(e) => setCalcForm({ ...calcForm, gross_income: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Tax Exempt Amount (ZMW)</Label>
                    <Input
                      type="number"
                      value={calcForm.tax_exempt_amount}
                      onChange={(e) => setCalcForm({ ...calcForm, tax_exempt_amount: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Calculation Month</Label>
                    <Input
                      type="month"
                      value={calcForm.calculation_month}
                      onChange={(e) => setCalcForm({ ...calcForm, calculation_month: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCalculatePaye} className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold">
                    Calculate PAYE
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Active Tax Slabs</span>
                <BarChart3 className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-semibold font-mono text-primary-500">{activeSlabs}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Configured bands</div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Total PAYE Collected</span>
                <DollarSign className="h-4 w-4 text-success-500" />
              </div>
              <div className="text-2xl font-semibold font-mono text-success-500">
                {institution.currency || "ZMW"} {(totalPayeCollected / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">This period</div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Processed Payroll</span>
                <CheckCircle className="h-4 w-4 text-primary-500" />
              </div>
              <div className="text-2xl font-semibold font-mono text-primary-500">{processedPayroll}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Completed runs</div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Pending Payroll</span>
                <Clock className="h-4 w-4 text-warning-500" />
              </div>
              <div className="text-2xl font-semibold font-mono text-warning-500">{pendingPayroll}</div>
              <div className="text-xs text-muted-foreground font-semibold mt-0.5">Awaiting processing</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="slabs" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="slabs" className="">
              <BarChart3 className="h-4 w-4 mr-2" /> Tax Slabs
            </TabsTrigger>
            <TabsTrigger value="calculations" className="">
              <Calculator className="h-4 w-4 mr-2" /> Calculations
            </TabsTrigger>
            <TabsTrigger value="payroll" className="">
              <FileText className="h-4 w-4 mr-2" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="statutory" className="">
              <Users className="h-4 w-4 mr-2" /> Statutory Deductions
            </TabsTrigger>
          </TabsList>

          {/* Tax Slabs Tab */}
          <TabsContent value="slabs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">PAYE Tax Slabs</h3>
              <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            {taxSlabs.length === 0 && (
              <Card className="border-border shadow-xs">
                <CardContent className="p-12 text-center space-y-3">
                  <Calculator className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-semibold">No tax slabs yet</p>
                  <p className="text-xs text-muted-foreground">Configure PAYE tax bands, or the ZRA 2024/25 statutory bands apply automatically.</p>
                  <Button onClick={() => setShowSlabDialog(true)} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold min-h-[44px]">
                    <Plus className="h-4 w-4 mr-1" /> Add Tax Slab
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxSlabs.map((slab) => (
                <Card key={slab.id} className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{slab.slab_name}</CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {new Date(slab.effective_from).toLocaleDateString()}
                        </div>
                      </div>
                      {slab.is_active ? (
                        <Badge className="bg-success-500 text-white text-xs">Active</Badge>
                      ) : (
                        <Badge className="bg-muted-foreground text-white text-xs">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Income Range</span>
                      <span className="font-semibold">
                        ZMW {slab.min_income.toLocaleString()} - {slab.max_income ? slab.max_income.toLocaleString() : "∞"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Fixed Amount</span>
                      <span className="font-semibold">ZMW {slab.fixed_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Plus % Above Min</span>
                      <span className="font-semibold text-primary-500">{slab.plus_percentage_above_min}%</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        {slab.description || "No description"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Calculations Tab */}
          <TabsContent value="calculations" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input type="search" aria-label="Search calculations..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="last">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <Card className="border-border shadow-xs overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Employee</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Month</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Gross Income</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Taxable Income</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">PAYE Tax</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Engine</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Calculated</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc) => (
                    <tr key={calc.id} className="border-t border-border hover:bg-canvas-bone ">
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold">
                          {calc.employee?.first_name} {calc.employee?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {calc.calculation_month}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tnum font-medium">
                        {institution.currency || "ZMW"} {calc.gross_income.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tnum font-medium">
                        {institution.currency || "ZMW"} {calc.taxable_income.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tnum font-medium">
                        {institution.currency || "ZMW"} {calc.total_paye_tax.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs" title={(calc as any).engine === 'zra-statutory' ? 'ZRA 2024/25 statutory bands (no custom slabs configured)' : 'This institution\u2019s custom tax slabs'}>
                          {(calc as any).engine === 'zra-statutory' ? 'ZRA statutory' : 'Custom slabs'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(calc.calculated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {calculations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="space-y-3">
                          <Calculator className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm font-semibold">No PAYE calculations yet</p>
                          <p className="text-xs text-muted-foreground">Run your first PAYE calculation for an employee payroll period.</p>
                          <Button onClick={() => setShowCalcDialog(true)} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold min-h-[44px]">
                            <Calculator className="h-4 w-4 mr-1" /> Calculate PAYE
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input type="search" aria-label="Search payroll..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                  <RefreshCw className="h-4 w-4 mr-1" /> Process Payroll
                </Button>
                <Button variant="outline" size="sm" className="text-xs min-h-[44px]">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            {payroll.length === 0 && (
              <Card className="border-border shadow-xs">
                <CardContent className="p-12 text-center space-y-3">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm font-semibold">No payroll runs yet</p>
                  <p className="text-xs text-muted-foreground">Calculate PAYE for an employee to generate their first payroll record.</p>
                  <Button onClick={() => setShowCalcDialog(true)} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold min-h-[44px]">
                    <Calculator className="h-4 w-4 mr-1" /> Calculate PAYE
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payroll.map((pay) => (
                <Card key={pay.id} className="border-border shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {pay.employee?.first_name} {pay.employee?.last_name}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {pay.month} {pay.year}
                        </div>
                      </div>
                      <Badge className={getStatusColor(pay.status) + " text-xs"}>
                        {pay.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Gross Pay</div>
                        <div className="text-sm font-semibold">
                          {institution.currency || "ZMW"} {pay.gross_pay.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Net Pay</div>
                        <div className="text-sm font-semibold text-success-500">
                          {institution.currency || "ZMW"} {pay.net_pay.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">PAYE Tax</span>
                      <span className="font-semibold text-error-500">
                        {institution.currency || "ZMW"} {pay.paye_tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">NAPSA (Emp)</span>
                      <span className="font-semibold text-primary-500">
                        {institution.currency || "ZMW"} {pay.napsa_employee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">NHIMA (Emp)</span>
                      <span className="font-semibold text-primary-500">
                        {institution.currency || "ZMW"} {pay.nhima_employee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Total Deductions: {institution.currency || "ZMW"} {(pay.paye_tax + pay.napsa_employee + pay.nhima_employee).toFixed(2)}
                      </div>
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Statutory Deductions Tab */}
          <TabsContent value="statutory" className="space-y-4">
            <Card className="border-border shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-500" /> NAPSA & NHIMA Statutory Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-xs">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="p-4 rounded-xl bg-muted">
                        <div className="text-sm font-semibold mb-1">NAPSA</div>
                        <div className="text-xs">National Pension Scheme Authority</div>
                        <div className="text-xs mt-1">Employee: 5% • Employer: 10%</div>
                      </div>
                      <div className="p-4 rounded-xl bg-muted">
                        <div className="text-sm font-semibold mb-1">NHIMA</div>
                        <div className="text-xs">National Health Insurance Management Authority</div>
                        <div className="text-xs mt-1">Employee: 1% • Employer: 2%</div>
                      </div>
                    </div>
                    <div className="text-xs">
                      Automated statutory deductions calculated based on current Zambian regulations
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

export default PayeTaxCalculations;