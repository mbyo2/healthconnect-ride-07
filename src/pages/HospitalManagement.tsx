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

const HospitalManagement = () => {
  const { user } = useAuth();

  const { data: hospital, isLoading: loadingHospital } = useQuery({
    queryKey: ['hospital', user?.id],
    queryFn: async () => {
      // Try hospital first, then any institution type
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {hospital.name}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">Hospital Management System • {hospital.type}</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
            <TabsTrigger value="opd" className="text-xs">OPD</TabsTrigger>
            <TabsTrigger value="ipd" className="text-xs">IPD/ADT</TabsTrigger>
            <TabsTrigger value="beds" className="text-xs">Beds & Wards</TabsTrigger>
            <TabsTrigger value="departments" className="text-xs">Departments</TabsTrigger>
            <TabsTrigger value="ot" className="text-xs">OT</TabsTrigger>
            <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff Roster</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard">
          <HMSDashboard
            hospital={hospital}
            departments={departments}
            beds={beds}
            admissions={admissions}
            invoices={invoices}
          />
        </TabsContent>

        <TabsContent value="opd">
          <OPDManagement hospital={hospital} departments={departments} />
        </TabsContent>

        <TabsContent value="ipd">
          <IPDManagement
            hospital={hospital}
            departments={departments}
            beds={beds}
            admissions={admissions}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="beds">
          <BedWardManagement
            hospital={hospital}
            departments={departments}
            beds={beds}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentManagement
            hospital={hospital}
            departments={departments}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="ot">
          <OTManagement />
        </TabsContent>

        <TabsContent value="billing">
          <HospitalBilling
            hospital={hospital}
            admissions={admissions}
            invoices={invoices}
            onRefresh={refreshAll}
          />
        </TabsContent>

        <TabsContent value="staff">
          <StaffRoster hospital={hospital} departments={departments} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HospitalManagement;
