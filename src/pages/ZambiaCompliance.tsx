import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldCheck, FileText, CheckCircle, AlertTriangle, Settings, Search,
  Download, Globe, Building2, Calendar, Eye, Edit, TrendingUp,
  BarChart3, Clock, Flag, CheckSquare
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

interface ZambiaNhimaConfig {
  id: string;
  institution_id: string;
  nhima_provider_code?: string;
  nhima_facility_type?: string;
  nhima_accreditation_number?: string;
  nhima_claim_submission_method: string;
  nhima_claim_processing_days: number;
  nhima_co_payment_percentage: number;
  nhima_excluded_services: any[];
  nhima_service_tariff_version?: string;
  nhima_reporting_requirements: any;
  is_nhima_accredited: boolean;
}

interface ZambiaMedicalCouncilConfig {
  id: string;
  institution_id: string;
  council_registration_number?: string;
  license_expiry_date?: string;
  inspection_date?: string;
  compliance_status: string;
  required_documentation: any[];
  staff_licensing_requirements: any;
  facility_standards_compliance: any;
  last_audit_date?: string;
  next_audit_date?: string;
}

interface ZambiaTaxConfig {
  id: string;
  institution_id: string;
  tax_account_number?: string;
  vat_registration_number?: string;
  vat_rate: number;
  withholding_tax_rate: number;
  paye_configured: boolean;
  turnover_tax_threshold: number;
  requires_ecfd_system: boolean;
  tax_compliance_status: string;
  last_filing_date?: string;
  next_filing_date?: string;
}

interface ZambiaHealthRegulation {
  id: string;
  regulation_code: string;
  regulation_name: string;
  regulation_category: string;
  compliance_requirements: any;
  documentation_requirements: any[];
  inspection_frequency: string;
  penalty_structure: any;
  is_active: boolean;
  effective_date: string;
}

export const ZambiaCompliance = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [nhimaConfig, setNhimaConfig] = useState<ZambiaNhimaConfig | null>(null);
  const [medicalCouncilConfig, setMedicalCouncilConfig] = useState<ZambiaMedicalCouncilConfig | null>(null);
  const [taxConfig, setTaxConfig] = useState<ZambiaTaxConfig | null>(null);
  const [regulations, setRegulations] = useState<ZambiaHealthRegulation[]>([]);
  const [showNhimaDialog, setShowNhimaDialog] = useState(false);
  const [showCouncilDialog, setShowCouncilDialog] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);

  // Form states
  const [nhimaForm, setNhimaForm] = useState({
    nhima_provider_code: "",
    nhima_facility_type: "clinic",
    nhima_accreditation_number: "",
    nhima_claim_submission_method: "electronic",
    nhima_claim_processing_days: 30,
    nhima_co_payment_percentage: 10,
    nhima_service_tariff_version: "",
  });

  const [councilForm, setCouncilForm] = useState({
    council_registration_number: "",
    license_expiry_date: "",
    inspection_date: "",
    next_audit_date: "",
  });

  const [taxForm, setTaxForm] = useState({
    tax_account_number: "",
    vat_registration_number: "",
    vat_rate: 16,
    withholding_tax_rate: 10,
    paye_configured: false,
    turnover_tax_threshold: 800000000,
    requires_ecfd_system: false,
    next_filing_date: "",
  });

  useEffect(() => {
    if (institution) {
      fetchComplianceData();
    }
  }, [institution]);

  const fetchComplianceData = async () => {
    if (!institution) return;

    try {
      const [nhimaRes, councilRes, taxRes, regulationsRes] = await Promise.all([
        supabase.from("zambia_nhima_config").select("*").eq("institution_id", institution.id).single(),
        supabase.from("zambia_medical_council_config").select("*").eq("institution_id", institution.id).single(),
        supabase.from("zambia_tax_config").select("*").eq("institution_id", institution.id).single(),
        supabase.from("zambia_health_regulations").select("*").eq("is_active", true).order("regulation_code"),
      ]);

      if (nhimaRes.data) setNhimaConfig(nhimaRes.data);
      if (councilRes.data) setMedicalCouncilConfig(councilRes.data);
      if (taxRes.data) setTaxConfig(taxRes.data);
      if (regulationsRes.data) setRegulations(regulationsRes.data);
    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNhima = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("zambia_nhima_config").upsert({
        institution_id: institution.id,
        ...nhimaForm,
        nhima_excluded_services: [],
        nhima_reporting_requirements: {},
      });

      if (error) throw error;
      setShowNhimaDialog(false);
      fetchComplianceData();
    } catch (error) {
      console.error("Error saving NHIMA config:", error);
    }
  };

  const handleSaveCouncil = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("zambia_medical_council_config").upsert({
        institution_id: institution.id,
        ...councilForm,
        required_documentation: [],
        staff_licensing_requirements: {},
        facility_standards_compliance: {},
        compliance_status: "pending_review",
      });

      if (error) throw error;
      setShowCouncilDialog(false);
      fetchComplianceData();
    } catch (error) {
      console.error("Error saving council config:", error);
    }
  };

  const handleSaveTax = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("zambia_tax_config").upsert({
        institution_id: institution.id,
        ...taxForm,
        tax_compliance_status: "active",
      });

      if (error) throw error;
      setShowTaxDialog(false);
      fetchComplianceData();
    } catch (error) {
      console.error("Error saving tax config:", error);
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "compliant": case "active": return "bg-[#00c875] text-white";
      case "non_compliant": case "suspended": return "bg-[#e44258] text-white";
      case "pending": case "pending_review": return "bg-[#fdab3d] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getOverallCompliance = () => {
    const nhimaCompliant = nhimaConfig?.is_nhima_accredited;
    const councilCompliant = medicalCouncilConfig?.compliance_status === "compliant";
    const taxCompliant = taxConfig?.tax_compliance_status === "active";

    if (nhimaCompliant && councilCompliant && taxCompliant) {
      return { status: "fully_compliant", color: "text-[#00c875]" };
    } else if (!councilCompliant || !taxCompliant) {
      return { status: "non_compliant", color: "text-[#e44258]" };
    } else {
      return { status: "partially_compliant", color: "text-[#fdab3d]" };
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
            <p className="text-xs text-[#676879]">Please select an institution to access Zambia compliance.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallCompliance = getOverallCompliance();

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Zambia Compliance</h1>
              <p className="text-xs text-[#676879] font-medium">Regulatory Compliance Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${overallCompliance.color} bg-opacity-10 text-xs font-bold px-3 py-1`}>
              {overallCompliance.status.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* Compliance Overview */}
        <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#0073ea]" /> Overall Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                <div className={`h-10 w-10 rounded-lg ${nhimaConfig?.is_nhis_accredited ? "bg-[#00c875]" : "bg-[#e44258]"} text-white flex items-center justify-center`}>
                  {nhimaConfig?.is_nhis_accredited ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">NHIMA Accreditation</div>
                  <div className="text-[10px] text-[#676879]">
                    {nhimaConfig?.is_nhima_accredited ? "Accredited" : "Not Accredited"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                <div className={`h-10 w-10 rounded-lg ${medicalCouncilConfig?.compliance_status === "compliant" ? "bg-[#00c875]" : "bg-[#e44258]"} text-white flex items-center justify-center`}>
                  {medicalCouncilConfig?.compliance_status === "compliant" ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">Medical Council</div>
                  <div className="text-[10px] text-[#676879]">
                    {medicalCouncilConfig?.compliance_status || "Not Configured"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f0f2f7] dark:bg-slate-800">
                <div className={`h-10 w-10 rounded-lg ${taxConfig?.tax_compliance_status === "active" ? "bg-[#00c875]" : "bg-[#e44258]"} text-white flex items-center justify-center`}>
                  {taxConfig?.tax_compliance_status === "active" ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">ZRA Tax Compliance</div>
                  <div className="text-[10px] text-[#676879]">
                    {taxConfig?.tax_compliance_status || "Not Configured"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="nhis" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="nhis" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Globe className="h-4 w-4 mr-2" /> NHIMA Configuration
            </TabsTrigger>
            <TabsTrigger value="council" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <FileText className="h-4 w-4 mr-2" /> Medical Council
            </TabsTrigger>
            <TabsTrigger value="tax" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> ZRA Tax
            </TabsTrigger>
            <TabsTrigger value="regulations" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <CheckSquare className="h-4 w-4 mr-2" /> Health Regulations
            </TabsTrigger>
          </TabsList>

          {/* NHIMA Configuration Tab */}
          <TabsContent value="nhis" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">National Health Insurance Scheme Configuration</h3>
              <Dialog open={showNhimaDialog} onOpenChange={setShowNhisDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                    <Settings className="h-4 w-4 mr-1" /> Configure NHIMA
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-extrabold">Configure NHIMA</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label className="text-xs font-bold">NHIMA Provider Code</Label>
                      <Input
                        value={nhimaForm.nhis_provider_code}
                        onChange={(e) => setNhisForm({ ...nhimaForm, nhis_provider_code: e.target.value })}
                        placeholder="e.g., NHIMA-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Facility Type</Label>
                      <Select
                        value={nhimaForm.nhis_facility_type}
                        onValueChange={(value) => setNhisForm({ ...nhimaForm, nhis_facility_type: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hospital">Hospital</SelectItem>
                          <SelectItem value="clinic">Clinic</SelectItem>
                          <SelectItem value="health_center">Health Center</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Accreditation Number</Label>
                      <Input
                        value={nhimaForm.nhis_accreditation_number}
                        onChange={(e) => setNhisForm({ ...nhimaForm, nhis_accreditation_number: e.target.value })}
                        placeholder="e.g., ACC-2024-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Claim Submission Method</Label>
                      <Select
                        value={nhimaForm.nhis_claim_submission_method}
                        onValueChange={(value) => setNhisForm({ ...nhimaForm, nhis_claim_submission_method: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electronic">Electronic</SelectItem>
                          <SelectItem value="paper">Paper</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold">Claim Processing Days</Label>
                        <Input
                          type="number"
                          value={nhimaForm.nhis_claim_processing_days}
                          onChange={(e) => setNhisForm({ ...nhimaForm, nhis_claim_processing_days: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Co-Payment %</Label>
                        <Input
                          type="number"
                          value={nhimaForm.nhis_co_payment_percentage}
                          onChange={(e) => setNhisForm({ ...nhimaForm, nhis_co_payment_percentage: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Service Tariff Version</Label>
                      <Input
                        value={nhimaForm.nhis_service_tariff_version}
                        onChange={(e) => setNhisForm({ ...nhimaForm, nhis_service_tariff_version: e.target.value })}
                        placeholder="e.g., 2024-v1"
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleSaveNhima} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                      Save NHIMA Configuration
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {nhimaConfig ? (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Current NHIMA Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-[#676879]">Provider Code</div>
                      <div className="text-sm font-bold">{nhimaConfig.nhis_provider_code || "Not Set"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#676879]">Facility Type</div>
                      <div className="text-sm font-bold">{nhimaConfig.nhis_facility_type || "Not Set"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#676879]">Accreditation #</div>
                      <div className="text-sm font-bold">{nhimaConfig.nhis_accreditation_number || "Not Set"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#676879]">Processing Days</div>
                      <div className="text-sm font-bold">{nhimaConfig.nhis_claim_processing_days} days</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                    <Badge className={nhimaConfig.is_nhis_accredited ? "bg-[#00c875] text-white text-[10px]" : "bg-[#e44258] text-white text-[10px]"}>
                      {nhimaConfig.is_nhis_accredited ? "Accredited" : "Not Accredited"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <Globe className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">NHIMA Not Configured</h3>
                  <p className="text-xs text-[#676879] mb-4">Configure your NHIMA settings to enable insurance claims</p>
                  <Button onClick={() => setShowNhisDialog(true)} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Configure NHIMA
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Medical Council Tab */}
          <TabsContent value="council" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Medical Council Compliance</h3>
              <Dialog open={showCouncilDialog} onOpenChange={setShowCouncilDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                    <Settings className="h-4 w-4 mr-1" /> Configure Council
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-extrabold">Configure Medical Council</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label className="text-xs font-bold">Council Registration Number</Label>
                      <Input
                        value={councilForm.council_registration_number}
                        onChange={(e) => setCouncilForm({ ...councilForm, council_registration_number: e.target.value })}
                        placeholder="e.g., MC-2024-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">License Expiry Date</Label>
                      <Input
                        type="date"
                        value={councilForm.license_expiry_date}
                        onChange={(e) => setCouncilForm({ ...councilForm, license_expiry_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Last Inspection Date</Label>
                      <Input
                        type="date"
                        value={councilForm.inspection_date}
                        onChange={(e) => setCouncilForm({ ...councilForm, inspection_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Next Audit Date</Label>
                      <Input
                        type="date"
                        value={councilForm.next_audit_date}
                        onChange={(e) => setCouncilForm({ ...councilForm, next_audit_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleSaveCouncil} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                      Save Council Configuration
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {medicalCouncilConfig ? (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Council Compliance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-[#676879]">Registration #</div>
                      <div className="text-sm font-bold">{medicalCouncilConfig.council_registration_number || "Not Set"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#676879]">License Expiry</div>
                      <div className="text-sm font-bold">
                        {medicalCouncilConfig.license_expiry_date 
                          ? new Date(medicalCouncilConfig.license_expiry_date).toLocaleDateString()
                          : "Not Set"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                    <Badge className={getComplianceStatusColor(medicalCouncilConfig.compliance_status) + " text-[10px]"}>
                      {medicalCouncilConfig.compliance_status || "Not Configured"}
                    </Badge>
                    {medicalCouncilConfig.next_audit_date && (
                      <div className="text-xs text-[#676879]">
                        Next Audit: {new Date(medicalCouncilConfig.next_audit_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">Medical Council Not Configured</h3>
                  <p className="text-xs text-[#676879] mb-4">Configure your medical council compliance settings</p>
                  <Button onClick={() => setShowCouncilDialog(true)} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Configure Council
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ZRA Tax Tab */}
          <TabsContent value="tax" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Zambia Revenue Authority Tax Configuration</h3>
              <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs">
                    <Settings className="h-4 w-4 mr-1" /> Configure Tax
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-extrabold">Configure ZRA Tax</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold">Tax Account Number</Label>
                        <Input
                          value={taxForm.tax_account_number}
                          onChange={(e) => setTaxForm({ ...taxForm, tax_account_number: e.target.value })}
                          placeholder="e.g., TAX-001"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">VAT Registration #</Label>
                        <Input
                          value={taxForm.vat_registration_number}
                          onChange={(e) => setTaxForm({ ...taxForm, vat_registration_number: e.target.value })}
                          placeholder="e.g., VAT-001"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold">VAT Rate (%)</Label>
                        <Input
                          type="number"
                          value={taxForm.vat_rate}
                          onChange={(e) => setTaxForm({ ...taxForm, vat_rate: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-bold">Withholding Tax (%)</Label>
                        <Input
                          type="number"
                          value={taxForm.withholding_tax_rate}
                          onChange={(e) => setTaxForm({ ...taxForm, withholding_tax_rate: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Turnover Tax Threshold (ZMW)</Label>
                      <Input
                        type="number"
                        value={taxForm.turnover_tax_threshold}
                        onChange={(e) => setTaxForm({ ...taxForm, turnover_tax_threshold: parseFloat(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">PAYE Configured</Label>
                        <Switch
                          checked={taxForm.paye_configured}
                          onCheckedChange={(checked) => setTaxForm({ ...taxForm, paye_configured: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Requires ECFD System</Label>
                        <Switch
                          checked={taxForm.requires_ecfd_system}
                          onCheckedChange={(checked) => setTaxForm({ ...taxForm, requires_ecfd_system: checked })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Next Filing Date</Label>
                      <Input
                        type="date"
                        value={taxForm.next_filing_date}
                        onChange={(e) => setTaxForm({ ...taxForm, next_filing_date: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleSaveTax} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                      Save Tax Configuration
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {taxConfig ? (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Tax Compliance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-[#676879]">VAT Rate</div>
                      <div className="text-sm font-bold">{taxConfig.vat_rate}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#676879]">Withholding Tax</div>
                      <div className="text-sm font-bold">{taxConfig.withholding_tax_rate}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                    <Badge className={getComplianceStatusColor(taxConfig.tax_compliance_status) + " text-[10px]"}>
                      {taxConfig.tax_compliance_status || "Not Configured"}
                    </Badge>
                    {taxConfig.requires_ecfd_system && (
                      <Badge className="bg-[#a25ddc] text-white text-[10px]">ECFD Required</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-[#0073ea] mb-4" />
                  <h3 className="text-sm font-extrabold mb-2">ZRA Tax Not Configured</h3>
                  <p className="text-xs text-[#676879] mb-4">Configure your tax compliance settings</p>
                  <Button onClick={() => setShowTaxDialog(true)} className="bg-[#0073ea] hover:bg-[#0056b3]">
                    Configure Tax
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Health Regulations Tab */}
          <TabsContent value="regulations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Zambia Health Regulations</h3>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export Regulations
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regulations.map((regulation) => (
                <Card key={regulation.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold">{regulation.regulation_name}</CardTitle>
                        <div className="text-[10px] text-[#676879]">{regulation.regulation_code}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{regulation.regulation_category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Inspection Frequency</span>
                      <span className="font-bold">{regulation.inspection_frequency}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Effective Date</span>
                      <span className="font-bold">{new Date(regulation.effective_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">
                        {regulation.documentation_requirements.length} documentation requirements
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
        </Tabs>
      </div>
    </div>
  );
};

export default ZambiaCompliance;