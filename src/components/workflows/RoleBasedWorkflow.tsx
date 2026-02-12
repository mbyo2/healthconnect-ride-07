import React from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { PatientWorkflow } from './PatientWorkflow';
import { HealthPersonnelWorkflow } from './HealthPersonnelWorkflow';
import { AdminWorkflow } from './AdminWorkflow';
import { InstitutionAdminWorkflow } from './InstitutionAdminWorkflow';
import { PharmacyWorkflow } from './PharmacyWorkflow';
import { LabWorkflow } from './LabWorkflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const RoleBasedWorkflow = () => {
  const { currentRole, userRole, isAdmin, availableRoles } = useUserRoles();
  
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

    // Check role-based workflows
    switch (activeRole) {
      case 'health_personnel':
      case 'doctor':
      case 'nurse':
      case 'radiologist':
        return <HealthPersonnelWorkflow />;
      case 'institution_admin':
      case 'institution_staff':
        return <InstitutionAdminWorkflow />;
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
