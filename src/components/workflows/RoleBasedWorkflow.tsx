import React from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { useAuth } from '@/context/AuthContext';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const RoleBasedWorkflow = () => {
  const { currentRole, userRole, isAdmin, isSuperAdmin, availableRoles } = useUserRoles();
  const { profile } = useAuth();
  
  const getCurrentWorkflow = () => {
    // Check for super admin / admin first
    if (isAdmin || isSuperAdmin) {
      return <AdminWorkflow />;
    }

    const activeRole = currentRole || userRole;

    // Support role
    if (activeRole === 'support') {
      return <SupportWorkflow />;
    }

    // Pharmacist (individual) vs Pharmacy (business)
    if (activeRole === 'pharmacist') {
      return <PharmacistWorkflow />;
    }
    if (activeRole === 'pharmacy' || availableRoles.some(r => r === 'pharmacy')) {
      return <PharmacyWorkflow />;
    }

    // Lab technician (individual) vs Lab (business)
    if (activeRole === 'lab_technician') {
      return <LabTechnicianWorkflow />;
    }
    if (activeRole === 'lab' || availableRoles.some(r => r === 'lab')) {
      return <LabWorkflow />;
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

    // Specific clinical roles
    switch (activeRole) {
      case 'doctor':
        return <DoctorWorkflow />;
      case 'nurse':
        return <NurseWorkflow />;
      case 'radiologist':
        return <RadiologistWorkflow />;
      case 'health_personnel':
        return <HealthPersonnelWorkflow />;
      case 'patient':
      default:
        return <PatientWorkflow />;
    }
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
    <div className="container mx-auto p-6">
      {getCurrentWorkflow()}
    </div>
  );
};
