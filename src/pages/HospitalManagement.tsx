import React from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Building2, Loader2, Activity, ShieldCheck, RefreshCw } from "lucide-react";
import { HMSDashboard } from "@/components/hospital/HMSDashboard";
import { OPDManagement } from "@/components/hospital/OPDManagement";
import { IPDManagement } from "@/components/hospital/IPDManagement";
import { BedWardManagement } from "@/components/hospital/BedWardManagement";
import { DepartmentManagement } from "@/components/hospital/DepartmentManagement";
import { OTManagement } from "@/components/hospital/OTManagement";
import { StaffRoster } from "@/components/hospital/StaffRoster";
import { HospitalBilling } from "@/components/hospital/HospitalBilling";
import { EMRCaseSheets } from "@/components/hospital/EMRCaseSheets";
import { HospitalPharmacy } from "@/components/hospital/HospitalPharmacy";
import { HospitalLab } from "@/components/hospital/HospitalLab";
import { RadiologyImaging } from "@/components/hospital/RadiologyImaging";
import { InventoryPurchase } from "@/components/hospital/InventoryPurchase";
import { DischargeSummary } from "@/components/hospital/DischargeSummary";
import { InsuranceTPA } from "@/components/hospital/InsuranceTPA";
import { DayCareManagement } from "@/components/hospital/DayCareManagement";
import { EmergencyTriage } from "@/components/hospital/EmergencyTriage";
import { MISReports } from "@/components/hospital/MISReports";
import { PatientQueue } from "@/components/hospital/PatientQueue";
import { ReferralManagement } from "@/components/hospital/ReferralManagement";
import { BloodBank } from "@/components/hospital/BloodBank";
import { CSSDManagement } from "@/components/hospital/CSSDManagement";
import { DietManagement } from "@/components/hospital/DietManagement";
import { InfectionManagement } from "@/components/clinical/InfectionManagement";
import { NotificationCenter } from "@/components/hospital/NotificationCenter";
import { PatientFeedback } from "@/components/hospital/PatientFeedback";
import { SecurityManagement } from "@/components/hospital/SecurityManagement";
import { TariffAndPriceManager } from "@/components/pricing/TariffAndPriceManager";

export const HospitalManagement = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const setActiveTab = (t: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  };

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ["hospital", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("healthcare_institutions")
        .select("*")
        .eq("admin_id", user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: departments = [], refetch: refetchDepts } = useQuery({
    queryKey: ["hospital-departments", hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_departments" as any)
        .select("*")
        .eq("hospital_id", hospital?.id)
        .order("name");
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: beds = [], refetch: refetchBeds } = useQuery({
    queryKey: ["hospital-beds", hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_beds" as any)
        .select("*, department:hospital_departments(name)")
        .eq("hospital_id", hospital?.id);
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: admissions = [], refetch: refetchAdmissions } = useQuery({
    queryKey: ["hospital-admissions", hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_admissions" as any)
        .select("*, patient:profiles!patient_id(first_name, last_name), department:hospital_departments(name)")
        .eq("hospital_id", hospital?.id)
        .eq("status", "admitted")
        .order("admission_date", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["hospital-patient-directory", hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, date_of_birth")
        .eq("role", "patient")
        .order("last_name")
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospital,
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["hospital-billing", hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("hospital_billing" as any)
        .select("*, patient:profiles!patient_id(first_name, last_name)")
        .eq("hospital_id", hospital?.id)
        .order("created_at", { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const refreshAll = () => {
    refetchDepts();
    refetchBeds();
    refetchAdmissions();
    refetchInvoices();
  };

  if (loadingHospital) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-[#f5f6f8] dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#0073ea]" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 p-6">
        <div className="max-w-xl mx-auto p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#e6e9ef] text-center space-y-3">
          <Building2 className="h-12 w-12 mx-auto text-[#0073ea]" />
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">No Institution Associated</h3>
          <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
            Register or link your healthcare facility to activate the Monday.com Hospital Operating System.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
      {/* Monday Sticky Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">{hospital.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-[#00c875]">
                  Live HMS Board
                </span>
              </div>
              <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                Hospital WorkOS • {hospital.type} • Lusaka Command Center
              </p>
            </div>
          </div>

          <button
            onClick={refreshAll}
            className="px-3 py-1.5 rounded-md bg-[#f0f2f7] dark:bg-slate-800 hover:bg-[#e5f0ff] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Board Data</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation & Body */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-[#e6e9ef] dark:border-slate-800">
            <TabsList className="inline-flex w-auto min-w-full flex-wrap h-auto gap-1 bg-transparent p-1">
              {[
                { val: "dashboard", label: "Dashboard" },
                { val: "notifications", label: "🔔 Alerts" },
                { val: "emr", label: "EMR" },
                { val: "opd", label: "OPD Queue" },
                { val: "ipd", label: "IPD / ADT" },
                { val: "emergency", label: "A&E Triage" },
                { val: "ot", label: "OT Surgery" },
                { val: "lab", label: "Lab LIMS" },
                { val: "radiology", label: "Radiology" },
                { val: "pharmacy", label: "Pharmacy POS" },
                { val: "beds", label: "Bed Wards" },
                { val: "billing", label: "Billing" },
                { val: "tariffs", label: "Tariff Rates" },
                { val: "insurance", label: "Insurance TPA" },
                { val: "discharge", label: "Discharge" },
                { val: "staff", label: "Staff Roster" },
                { val: "mis", label: "MIS Reports" },
              ].map((t) => (
                <TabsTrigger
                  key={t.val}
                  value={t.val}
                  className="text-xs font-extrabold px-3 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white transition-all"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs">
            <TabsContent value="dashboard"><HMSDashboard hospital={hospital} departments={departments} beds={beds} admissions={admissions} invoices={invoices} /></TabsContent>
            <TabsContent value="notifications"><NotificationCenter hospitalId={hospital.id} /></TabsContent>
            <TabsContent value="emr"><EMRCaseSheets hospital={hospital} departments={departments} /></TabsContent>
            <TabsContent value="opd"><OPDManagement hospital={hospital} departments={departments} /></TabsContent>
            <TabsContent value="ipd"><IPDManagement hospital={hospital} patients={patients} departments={departments} beds={beds} admissions={admissions} onRefresh={refreshAll} /></TabsContent>
            <TabsContent value="emergency"><EmergencyTriage hospital={hospital} /></TabsContent>
            <TabsContent value="ot"><OTManagement hospital={hospital} /></TabsContent>
            <TabsContent value="lab"><HospitalLab hospital={hospital} /></TabsContent>
            <TabsContent value="radiology"><RadiologyImaging hospital={hospital} /></TabsContent>
            <TabsContent value="pharmacy"><HospitalPharmacy hospital={hospital} /></TabsContent>
            <TabsContent value="beds"><BedWardManagement hospital={hospital} departments={departments} beds={beds} onRefresh={refreshAll} /></TabsContent>
            <TabsContent value="billing"><HospitalBilling hospital={hospital} admissions={admissions} invoices={invoices} onRefresh={refreshAll} /></TabsContent>
            <TabsContent value="tariffs"><TariffAndPriceManager /></TabsContent>
            <TabsContent value="insurance"><InsuranceTPA hospital={hospital} /></TabsContent>
            <TabsContent value="discharge"><DischargeSummary hospital={hospital} admissions={admissions} /></TabsContent>
            <TabsContent value="staff"><StaffRoster hospital={hospital} departments={departments} /></TabsContent>
            <TabsContent value="mis"><MISReports hospital={hospital} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default HospitalManagement;
