import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Calculator, DollarSign, TrendingUp, Plus, Search, Filter, Download,
  Settings, Eye, Edit, Trash2, Calendar, Clock, Building2, Users,
  CheckCircle, AlertTriangle, BarChart3, FileText, RefreshCw
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
      if (calculationsRes.data) setCalculations(calculationsRes.data);
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

    // Calculate PAYE based on Zambia's current tax slabs
    const taxableIncome = calcForm.gross_income - calcForm.tax_exempt_amount;
    let totalTax = 0;
    const slabApplied: any[] = [];

    // Zambia PAYE calculation logic (simplified - actual rates may vary)
    // This is a placeholder for the actual Zambia PAYE calculation
    const sortedSlabs = [...taxSlabs].sort((a, b) => a.min_income - b.min_income);
    
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
      case "processed": return "bg-[#00c875] text-white";
      case "pending": return "bg-[#fdab3d] text-white";
      case "failed": return "bg-[#e44258] text-white";
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
            <p className="text-xs text-[#676879]">Please select an institution to access PAYE calculations.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
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
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">PAYE Tax Calculations</h1>
              <p className="text-xs text-[#676879] font-medium">Zambian Pay-As-You-Earn Tax Slabs & Payroll</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSlabDialog} onOpenChange={setShowSlabDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Tax Slab
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Add PAYE Tax Slab</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Slab Name</Label>
                    <Input
                      value={slabForm.slab_name}
                      onChange={(e) => setSlabForm({ ...slabForm, slab_name: e.target.value })}
                      placeholder="e.g., Band 1"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Min Income (ZMW)</Label>
                      <Input
                        type="number"
                        value={slabForm.min_income}
                        onChange={(e) => setSlabForm({ ...slabForm, min_income: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Max Income (ZMW)</Label>
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
                      <Label className="text-xs font-bold">Fixed Amount (ZMW)</Label>
                      <Input
                        type="number"
                        value={slabForm.fixed_amount}
                        onChange={(e) => setSlabForm({ ...slabForm, fixed_amount: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Plus % Above Min</Label>
                      <Input
                        type="number"
                        value={slabForm.plus_percentage_above_min}
                        onChange={(e) => setSlabForm({ ...slabForm, plus_percentage_above_min: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Effective From</Label>
                    <Input
                      type="date"
                      value={slabForm.effective_from}
                      onChange={(e) => setSlabForm({ ...slabForm, effective_from: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Description</Label>
                    <Textarea
                      value={slabForm.description}
                      onChange={(e) => setSlabForm({ ...slabForm, description: e.target.value })}
                      placeholder="Slab description..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateSlab} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Add Tax Slab
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showCalcDialog} onOpenChange={setShowCalcDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-bold">
                  <Calculator className="h-4 w-4 mr-1" /> Calculate PAYE
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Calculate PAYE Tax</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Employee</Label>
                    <Select
                      value={calcForm.employee_id}
                      onValueChange={(value) => setCalcForm({ ...calcForm, employee_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder">Select employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Gross Income (ZMW)</Label>
                    <Input
                      type="number"
                      value={calcForm.gross_income}
                      onChange={(e) => setCalcForm({ ...calcForm, gross_income: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Tax Exempt Amount (ZMW)</Label>
                    <Input
                      type="number"
                      value={calcForm.tax_exempt_amount}
                      onChange={(e) => setCalcForm({ ...calcForm, tax_exempt_amount: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Calculation Month</Label>
                    <Input
                      type="month"
                      value={calcForm.calculation_month}
                      onChange={(e) => setCalcForm({ ...calcForm, calculation_month: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCalculatePaye} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Calculate PAYE
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
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Active Tax Slabs</span>
                <BarChart3 className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{activeSlabs}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Configured bands</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total PAYE Collected</span>
                <DollarSign className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#00c875]">
                {institution.currency || "ZMW"} {(totalPayeCollected / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">This period</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Processed Payroll</span>
                <CheckCircle className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">{processedPayroll}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Completed runs</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Payroll</span>
                <Clock className="h-4 w-4 text-[#fdab3d]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#fdab3d]">{pendingPayroll}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting processing</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="slabs" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="slabs" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> Tax Slabs
            </TabsTrigger>
            <TabsTrigger value="calculations" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Calculator className="h-4 w-4 mr-2" /> Calculations
            </TabsTrigger>
            <TabsTrigger value="payroll" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Payroll
            </TabsTrigger>
            <TabsTrigger value="statutory" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Statutory Deductions
            </TabsTrigger>
          </TabsList>

          {/* Tax Slabs Tab */}
          <TabsContent value="slabs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">PAYE Tax Slabs</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {taxSlabs.map((slab) => (
                <Card key={slab.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{slab.slab_name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">
                          {new Date(slab.effective_from).toLocaleDateString()}
                        </div>
                      </div>
                      {slab.is_active ? (
                        <Badge className="bg-[#00c875] text-white text-[10px]">Active</Badge>
                      ) : (
                        <Badge className="bg-[#676879] text-white text-[10px]">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Income Range</span>
                      <span className="font-bold">
                        ZMW {slab.min_income.toLocaleString()} - {slab.max_income ? slab.max_income.toLocaleString() : "∞"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Fixed Amount</span>
                      <span className="font-bold">ZMW {slab.fixed_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Plus % Above Min</span>
                      <span className="font-bold text-[#a25ddc]">{slab.plus_percentage_above_min}%</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {slab.description || "No description"}
                      </div>
                      <div className="flex items-center gap-1">
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

          {/* Calculations Tab */}
          <TabsContent value="calculations" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search calculations..." className="w-64 h-9 text-xs" />
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
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Employee</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Month</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Gross Income</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Taxable Income</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">PAYE Tax</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Calculated</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc) => (
                    <tr key={calc.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">
                          {calc.employee?.first_name} {calc.employee?.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {calc.calculation_month}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {institution.currency || "ZMW"} {calc.gross_income.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {institution.currency || "ZMW"} {calc.taxable_income.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#e44258]">
                        {institution.currency || "ZMW"} {calc.total_paye_tax.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(calc.calculated_at).toLocaleDateString()}
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

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search payroll..." className="w-64 h-9 text-xs" />
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
                <Button variant="outline" size="sm" className="text-xs">
                  <RefreshCw className="h-4 w-4 mr-1" /> Process Payroll
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payroll.map((pay) => (
                <Card key={pay.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">
                          {pay.employee?.first_name} {pay.employee?.last_name}
                        </CardTitle>
                        <div className="text-[10px] text-[#676879]">
                          {pay.month} {pay.year}
                        </div>
                      </div>
                      <Badge className={getStatusColor(pay.status) + " text-[10px]"}>
                        {pay.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[#676879]">Gross Pay</div>
                        <div className="text-sm font-bold">
                          {institution.currency || "ZMW"} {pay.gross_pay.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#676879]">Net Pay</div>
                        <div className="text-sm font-bold text-[#00c875]">
                          {institution.currency || "ZMW"} {pay.net_pay.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">PAYE Tax</span>
                      <span className="font-bold text-[#e44258]">
                        {institution.currency || "ZMW"} {pay.paye_tax.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">NAPSA (Emp)</span>
                      <span className="font-bold text-[#a25ddc]">
                        {institution.currency || "ZMW"} {pay.napsa_employee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">NHIMA (Emp)</span>
                      <span className="font-bold text-[#0073ea]">
                        {institution.currency || "ZMW"} {pay.nhima_employee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        Total Deductions: {institution.currency || "ZMW"} {(pay.paye_tax + pay.napsa_employee + pay.nhima_employee).toFixed(2)}
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

          {/* Statutory Deductions Tab */}
          <TabsContent value="statutory" className="space-y-4">
            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#0073ea]" /> NAPSA & NHIMA Statutory Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-[#676879] text-xs">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4">
                      <div className="p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                        <div className="text-sm font-bold mb-1">NAPSA</div>
                        <div className="text-[10px]">National Pension Scheme Authority</div>
                        <div className="text-[10px] mt-1">Employee: 5% • Employer: 10%</div>
                      </div>
                      <div className="p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                        <div className="text-sm font-bold mb-1">NHIMA</div>
                        <div className="text-[10px]">National Health Insurance Management Authority</div>
                        <div className="text-[10px] mt-1">Employee: 1% • Employer: 2%</div>
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