import React from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { useAuth } from '@/context/AuthContext';
import { PatientWorkflow } from './PatientWorkflow';
import { HealthPersonnelWorkflow } from './HealthPersonnelWorkflow';
import { AdminWorkflow } from './AdminWorkflow';
import { InstitutionAdminWorkflow } from './InstitutionAdminWorkflow';
import { PharmacyWorkflow } from './PharmacyWorkflow';
import { LabWorkflow } from './LabWorkflow';
import { NurseWorkflow } from './NurseWorkflow';
import { NursingHomeWorkflow } from './NursingHomeWorkflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const RoleBasedWorkflow = () => {
  const { currentRole, userRole, isAdmin, availableRoles } = useUserRoles();
  const { profile } = useAuth();
  
  const getCurrentWorkflow = () => {
    // Check for admin first
    if (isAdmin) {
      return <AdminWorkflow />;
    }

    const activeRole = currentRole || userRole;

    // Check for pharmacy roles
    if (activeRole === 'pharmacy' || activeRole === 'pharmacist' || 
        availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return <PharmacyWorkflow />;
    }

    // Check for lab roles
    if (activeRole === 'lab' || activeRole === 'lab_technician' ||
        availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return <LabWorkflow />;
    }

    // Institution admin/staff — check if nursing home type
    if (activeRole === 'institution_admin' || activeRole === 'institution_staff' ||
        availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      // Check profile specialty or institution type for nursing home
      const specialty = profile?.specialty?.toLowerCase() || '';
      if (specialty.includes('nursing home') || specialty.includes('care home') || specialty.includes('aged care')) {
        return <NursingHomeWorkflow />;
      }
      return <InstitutionAdminWorkflow />;
    }

    // Check role-based workflows
    switch (activeRole) {
      case 'nurse':
        // Solo nurse consultant gets nurse-specific workflow
        return <NurseWorkflow />;
      case 'health_personnel':
      case 'doctor':
      case 'radiologist':
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
