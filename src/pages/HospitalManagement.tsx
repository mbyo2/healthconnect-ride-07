import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Building2, Loader2 } from 'lucide-react';
import { HMSDashboard } from '@/components/hospital/HMSDashboard';
import { OPDManagement } from '@/components/hospital/OPDManagement';
import { IPDManagement } from '@/components/hospital/IPDManagement';
import { BedWardManagement } from '@/components/hospital/BedWardManagement';
import { DepartmentManagement } from '@/components/hospital/DepartmentManagement';
import { OTManagement } from '@/components/hospital/OTManagement';
import { StaffRoster } from '@/components/hospital/StaffRoster';
import { HospitalBilling } from '@/components/hospital/HospitalBilling';
import { EMRCaseSheets } from '@/components/hospital/EMRCaseSheets';
import { HospitalPharmacy } from '@/components/hospital/HospitalPharmacy';
import { HospitalLab } from '@/components/hospital/HospitalLab';
import { RadiologyImaging } from '@/components/hospital/RadiologyImaging';
import { InventoryPurchase } from '@/components/hospital/InventoryPurchase';
import { DischargeSummary } from '@/components/hospital/DischargeSummary';
import { InsuranceTPA } from '@/components/hospital/InsuranceTPA';
import { DayCareManagement } from '@/components/hospital/DayCareManagement';
import { EmergencyTriage } from '@/components/hospital/EmergencyTriage';
import { MISReports } from '@/components/hospital/MISReports';
import { PatientQueue } from '@/components/hospital/PatientQueue';
import { ReferralManagement } from '@/components/hospital/ReferralManagement';
import { BloodBank } from '@/components/hospital/BloodBank';
import { CSSDManagement } from '@/components/hospital/CSSDManagement';
import { DietManagement } from '@/components/hospital/DietManagement';

const HospitalManagement = () => {
  const { user } = useAuth();

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ['hospital', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('admin_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: departments = [], refetch: refetchDepts } = useQuery({
    queryKey: ['hospital-departments', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hospital_departments' as any)
        .select('*')
        .eq('hospital_id', hospital?.id)
        .order('name');
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: beds = [], refetch: refetchBeds } = useQuery({
    queryKey: ['hospital-beds', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hospital_beds' as any)
        .select('*, department:hospital_departments(name)')
        .eq('hospital_id', hospital?.id);
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: admissions = [], refetch: refetchAdmissions } = useQuery({
    queryKey: ['hospital-admissions', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hospital_admissions' as any)
        .select('*, patient:profiles!patient_id(first_name, last_name), department:hospital_departments(name)')
        .eq('hospital_id', hospital?.id)
        .eq('status', 'admitted')
        .order('admission_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!hospital,
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['hospital-billing', hospital?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hospital_billing' as any)
        .select('*, patient:profiles!patient_id(first_name, last_name)')
        .eq('hospital_id', hospital?.id)
        .order('created_at', { ascending: false });
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Institution Found</h3>
            <p className="text-muted-foreground">
              Register your institution first to access the Hospital Management System.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {hospital.name}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">Hospital Management System • {hospital.type}</p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="emr" className="text-xs">EMR</TabsTrigger>
            <TabsTrigger value="opd" className="text-xs">OPD</TabsTrigger>
            <TabsTrigger value="ipd" className="text-xs">IPD/ADT</TabsTrigger>
            <TabsTrigger value="emergency" className="text-xs">A&E</TabsTrigger>
            <TabsTrigger value="ot" className="text-xs">OT</TabsTrigger>
            <TabsTrigger value="daycare" className="text-xs">Day Care</TabsTrigger>
            <TabsTrigger value="lab" className="text-xs">Lab/LIMS</TabsTrigger>
            <TabsTrigger value="radiology" className="text-xs">Radiology</TabsTrigger>
            <TabsTrigger value="pharmacy" className="text-xs">Pharmacy</TabsTrigger>
            <TabsTrigger value="beds" className="text-xs">Beds</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
            <TabsTrigger value="insurance" className="text-xs">Insurance</TabsTrigger>
            <TabsTrigger value="discharge" className="text-xs">Discharge</TabsTrigger>
            <TabsTrigger value="queue" className="text-xs">Queue</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
            <TabsTrigger value="bloodbank" className="text-xs">Blood Bank</TabsTrigger>
            <TabsTrigger value="cssd" className="text-xs">CSSD</TabsTrigger>
            <TabsTrigger value="diet" className="text-xs">Diet</TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs">Referrals</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
            <TabsTrigger value="departments" className="text-xs">Departments</TabsTrigger>
            <TabsTrigger value="mis" className="text-xs">MIS Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <HMSDashboard hospital={hospital} departments={departments} beds={beds} admissions={admissions} invoices={invoices} />
        </TabsContent>
        <TabsContent value="emr"><EMRCaseSheets hospital={hospital} departments={departments} /></TabsContent>
        <TabsContent value="opd"><OPDManagement hospital={hospital} departments={departments} /></TabsContent>
        <TabsContent value="ipd"><IPDManagement hospital={hospital} departments={departments} beds={beds} admissions={admissions} onRefresh={refreshAll} /></TabsContent>
        <TabsContent value="emergency"><EmergencyTriage hospital={hospital} /></TabsContent>
        <TabsContent value="ot"><OTManagement /></TabsContent>
        <TabsContent value="daycare"><DayCareManagement hospital={hospital} /></TabsContent>
        <TabsContent value="lab"><HospitalLab hospital={hospital} /></TabsContent>
        <TabsContent value="radiology"><RadiologyImaging hospital={hospital} /></TabsContent>
        <TabsContent value="pharmacy"><HospitalPharmacy hospital={hospital} /></TabsContent>
        <TabsContent value="beds"><BedWardManagement hospital={hospital} departments={departments} beds={beds} onRefresh={refreshAll} /></TabsContent>
        <TabsContent value="billing"><HospitalBilling hospital={hospital} admissions={admissions} invoices={invoices} onRefresh={refreshAll} /></TabsContent>
        <TabsContent value="insurance"><InsuranceTPA hospital={hospital} /></TabsContent>
        <TabsContent value="discharge"><DischargeSummary hospital={hospital} admissions={admissions} /></TabsContent>
        <TabsContent value="queue"><PatientQueue hospital={hospital} departments={departments} /></TabsContent>
        <TabsContent value="inventory"><InventoryPurchase hospital={hospital} /></TabsContent>
        <TabsContent value="bloodbank"><BloodBank hospital={hospital} /></TabsContent>
        <TabsContent value="cssd"><CSSDManagement hospital={hospital} /></TabsContent>
        <TabsContent value="diet"><DietManagement hospital={hospital} /></TabsContent>
        <TabsContent value="referrals"><ReferralManagement hospital={hospital} /></TabsContent>
        <TabsContent value="staff"><StaffRoster hospital={hospital} departments={departments} /></TabsContent>
        <TabsContent value="departments"><DepartmentManagement hospital={hospital} departments={departments} onRefresh={refreshAll} /></TabsContent>
        <TabsContent value="mis"><MISReports hospital={hospital} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default HospitalManagement;
