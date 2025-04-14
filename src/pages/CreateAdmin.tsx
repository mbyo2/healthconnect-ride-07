import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";
import { setupAdmin, setupSuperAdmin } from '@/utils/setupAdmin';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const CreateAdmin: React.FC = () => {
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isLoadingSuperAdmin, setIsLoadingSuperAdmin] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState<{email: string, password: string} | null>(null);
  const [superAdminCredentials, setSuperAdminCredentials] = useState<{email: string, password: string} | null>(null);
  const { isAuthenticated, user } = useAuth();
  
  // Fixed type checking for admin_level
  const hasAdminPrivileges = isAuthenticated && user && 
    ('admin_level' in user ? user.admin_level : false);

  const handleCreateAdmin = async () => {
    setIsLoadingAdmin(true);
    try {
      const result = await setupAdmin();
      
      if (result.success) {
        toast.success(result.alreadyExists ? 
          "Admin account already exists" : 
          "Admin account created successfully"
        );
        setAdminCredentials(result.credentials);
      } else {
        toast.error(`Failed to create admin: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Failed to create admin'}`);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const handleCreateSuperAdmin = async () => {
    setIsLoadingSuperAdmin(true);
    try {
      const result = await setupSuperAdmin();
      
      if (result.success) {
        toast.success(result.alreadyExists ? 
          "SuperAdmin account already exists" : 
          "SuperAdmin account created successfully"
        );
        setSuperAdminCredentials(result.credentials);
      } else {
        toast.error(`Failed to create superadmin: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Failed to create superadmin'}`);
    } finally {
      setIsLoadingSuperAdmin(false);
    }
  };

  if (isAuthenticated && !hasAdminPrivileges) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/">
              <Button variant="secondary">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Link to="/">
        <Button variant="ghost" className="mb-4">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Admin Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Admin Account</CardTitle>
            <CardDescription>
              Create a standard administrator account with permissions to manage users and content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adminCredentials ? (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">Admin Credentials</h3>
                <p><span className="font-medium">Email:</span> {adminCredentials.email}</p>
                <p><span className="font-medium">Password:</span> {adminCredentials.password}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Keep these credentials secure!
                </p>
              </div>
            ) : (
              <p>
                An admin user can manage users, appointments, and healthcare providers.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateAdmin} 
              disabled={isLoadingAdmin || !!adminCredentials}
              className="w-full"
            >
              {isLoadingAdmin ? <LoadingScreen className="h-4 w-4" /> : adminCredentials ? 'Admin Created' : 'Create Admin Account'}
            </Button>
          </CardFooter>
        </Card>

        {/* SuperAdmin Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create SuperAdmin Account</CardTitle>
            <CardDescription>
              Create a super administrator account with complete system access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {superAdminCredentials ? (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">SuperAdmin Credentials</h3>
                <p><span className="font-medium">Email:</span> {superAdminCredentials.email}</p>
                <p><span className="font-medium">Password:</span> {superAdminCredentials.password}</p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Keep these credentials secure!
                </p>
              </div>
            ) : (
              <p>
                A super admin has full access to all system features including creating other admins.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleCreateSuperAdmin} 
              disabled={isLoadingSuperAdmin || !!superAdminCredentials}
              className="w-full"
            >
              {isLoadingSuperAdmin ? <LoadingScreen className="h-4 w-4" /> : superAdminCredentials ? 'SuperAdmin Created' : 'Create SuperAdmin Account'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {(adminCredentials || superAdminCredentials) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal ml-6 space-y-2">
              <li>Log in with the credentials provided above</li>
              <li>Visit the admin dashboard at <code>/admin-dashboard</code></li>
              <li>For superadmin access, visit <code>/superadmin-dashboard</code></li>
              <li>Use these accounts to manage the Doc' O Clock application</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateAdmin;
