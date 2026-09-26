import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/context/UserRolesContext';
import { useAuth } from '@/context/AuthContext';
import { AccountApprovalGate } from '@/components/auth/AccountApprovalGate';
import { PatientWorkflow } from './PatientWorkflow';
import { HealthPersonnelWorkflow } from './HealthPersonnelWorkflow';
import { DoctorWorkflow } from './DoctorWorkflow';
import { AdminWorkflow } from './AdminWorkflow';
import { InstitutionAdminWorkflow } from './InstitutionAdminWorkflow';
import { InstitutionStaffWorkflow } from './InstitutionStaffWorkflow';
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
import { NURSING_ROLES, COMMUNITY_ROLES } from '@/config/roleConfig';

// Prescribing clinicians share the doctor console.
const DOCTOR_LIKE_ROLES = [
  'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist',
];
// Allied & community cadres share the generic clinical console.
const ALLIED_LIKE_ROLES = [
  'dental_therapist', 'radiographer', 'physiotherapist', 'occupational_therapist',
  'nutritionist', 'optometrist', 'psychologist',
  ...COMMUNITY_ROLES,
];

export const RoleBasedWorkflow = () => {
  const navigate = useNavigate();
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
      case 'pharmacy_technologist':
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

    // New-taxonomy roles resolve to their closest console (never the
    // patient workflow — that was the fall-through bug for new cadres).
    if (activeRole && DOCTOR_LIKE_ROLES.includes(activeRole)) {
      return <DoctorWorkflow />;
    }
    if (activeRole && (NURSING_ROLES as readonly string[]).includes(activeRole)) {
      return <NurseWorkflow />;
    }
    if (activeRole && ALLIED_LIKE_ROLES.includes(activeRole)) {
      return <HealthPersonnelWorkflow />;
    }
    if (activeRole === 'wholesale_pharmacy') {
      return <PharmacyWorkflow />;
    }
    if (activeRole === 'medical_records_officer') {
      return <InstitutionStaffWorkflow />;
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
    if (activeRole === 'institution_admin' || activeRole === 'institution_staff' || activeRole === 'medical_records_officer' ||
        availableRoles.some(r => ['institution_admin', 'institution_staff', 'medical_records_officer'].includes(r))) {
      const specialty = profile?.specialty?.toLowerCase() || '';
      if (specialty.includes('nursing home') || specialty.includes('care home') || specialty.includes('aged care')) {
        return <NursingHomeWorkflow />;
      }
      // Staff gets reduced-permission UI
      if (activeRole === 'institution_staff' || activeRole === 'medical_records_officer') {
        return <InstitutionStaffWorkflow />;
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
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="vf-btn-primary w-full mt-4 min-h-[44px]"
          >
            Complete profile setup
          </button>
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
