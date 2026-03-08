import React from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { useAuth } from '@/context/AuthContext';
import { AccountApprovalGate } from '@/components/auth/AccountApprovalGate';
import { PatientWorkflow } from './PatientWorkflow';
import { HealthPersonnelWorkflow } from './HealthPersonnelWorkflow';
import { DoctorWorkflow } from './DoctorWorkflow';
import { AdminWorkflow } from './AdminWorkflow';
import { InstitutionAdminWorkflow } from './InstitutionAdminWorkflow';
import { PharmacyWorkflow } from './PharmacyWorkflow';
import { PharmacistWorkflow } from './PharmacistWorkflow';
import { LabWorkflow } from './LabWorkflow';
import { LabTechnicianWorkflow } from './LabTechnicianWorkflow';
import { NurseWorkflow } from './NurseWorkflow';
import { NursingHomeWorkflow } from './NursingHomeWorkflow';
import { RadiologistWorkflow } from './RadiologistWorkflow';
import { SupportWorkflow } from './SupportWorkflow';
import { ReceptionistWorkflow } from './ReceptionistWorkflow';
import { HRManagerWorkflow } from './HRManagerWorkflow';
import { CXOWorkflow } from './CXOWorkflow';
import { OTStaffWorkflow } from './OTStaffWorkflow';
import { PhlebotomistWorkflow } from './PhlebotomistWorkflow';
import { BillingStaffWorkflow } from './BillingStaffWorkflow';
import { InventoryManagerWorkflow } from './InventoryManagerWorkflow';
import { TriageStaffWorkflow } from './TriageStaffWorkflow';
import { MaintenanceManagerWorkflow } from './MaintenanceManagerWorkflow';
import { SpecialistWorkflow } from './SpecialistWorkflow';
import { AmbulanceStaffWorkflow } from './AmbulanceStaffWorkflow';
import { PathologistWorkflow } from './PathologistWorkflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const RoleBasedWorkflow = () => {
  const { currentRole, userRole, isAdmin, isSuperAdmin, availableRoles } = useUserRoles();
  const { profile } = useAuth();
  
  const getCurrentWorkflow = () => {
    if (isAdmin || isSuperAdmin) {
      return <AdminWorkflow />;
    }

    const activeRole = currentRole || userRole;

    switch (activeRole) {
      case 'support':
        return <SupportWorkflow />;
      case 'cxo':
        return <CXOWorkflow />;
      case 'receptionist':
        return <ReceptionistWorkflow />;
      case 'hr_manager':
        return <HRManagerWorkflow />;
      case 'ot_staff':
        return <OTStaffWorkflow />;
      case 'phlebotomist':
        return <PhlebotomistWorkflow />;
      case 'billing_staff':
        return <BillingStaffWorkflow />;
      case 'inventory_manager':
        return <InventoryManagerWorkflow />;
      case 'triage_staff':
        return <TriageStaffWorkflow />;
      case 'maintenance_manager':
        return <MaintenanceManagerWorkflow />;
      case 'specialist':
        return <SpecialistWorkflow />;
      case 'ambulance_staff':
        return <AmbulanceStaffWorkflow />;
      case 'pathologist':
        return <PathologistWorkflow />;
      case 'pharmacist':
        return <PharmacistWorkflow />;
      case 'doctor':
        return <DoctorWorkflow />;
      case 'nurse':
        return <NurseWorkflow />;
      case 'radiologist':
        return <RadiologistWorkflow />;
      case 'health_personnel':
        return <HealthPersonnelWorkflow />;
      default:
        break;
    }

    // Pharmacy / Lab business entities
    if (activeRole === 'pharmacy' || availableRoles.some(r => r === 'pharmacy')) {
      return <PharmacyWorkflow />;
    }
    if (activeRole === 'lab' || availableRoles.some(r => r === 'lab')) {
      return <LabWorkflow />;
    }
    if (activeRole === 'lab_technician') {
      return <LabTechnicianWorkflow />;
    }

    // Institution admin/staff — check if nursing home type
    if (activeRole === 'institution_admin' || activeRole === 'institution_staff' ||
        availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      const specialty = profile?.specialty?.toLowerCase() || '';
      if (specialty.includes('nursing home') || specialty.includes('care home') || specialty.includes('aged care')) {
        return <NursingHomeWorkflow />;
      }
      return <InstitutionAdminWorkflow />;
    }

    // Default: Patient
    return <PatientWorkflow />;
  };

  if (!currentRole && !userRole) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome to Doc' O Clock</CardTitle>
          <CardDescription>
            Please complete your profile setup to access your personalized workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Your user role is being determined. Please refresh the page or complete your profile setup.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <AccountApprovalGate>
      <div className="container mx-auto p-6">
        {getCurrentWorkflow()}
      </div>
    </AccountApprovalGate>
  );
};
