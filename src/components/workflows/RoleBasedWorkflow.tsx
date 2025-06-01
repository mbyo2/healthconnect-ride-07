
import React from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { PatientWorkflow } from './PatientWorkflow';
import { HealthPersonnelWorkflow } from './HealthPersonnelWorkflow';
import { AdminWorkflow } from './AdminWorkflow';
import { InstitutionAdminWorkflow } from './InstitutionAdminWorkflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export const RoleBasedWorkflow = () => {
  const { currentRole, userRole, isAdmin } = useUserRoles();
  
  // Determine which workflow to show based on current role
  const getCurrentWorkflow = () => {
    // Check for admin first (admin_level takes precedence)
    if (isAdmin) {
      return <AdminWorkflow />;
    }
    
    // Then check role-based workflows
    switch (currentRole || userRole) {
      case 'health_personnel':
        return <HealthPersonnelWorkflow />;
      case 'institution_admin':
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
