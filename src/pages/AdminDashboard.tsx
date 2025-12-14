import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { SecurityAuditLogs } from '@/components/admin/SecurityAuditLogs';
import { TestAccountSetup } from '@/components/admin/TestAccountSetup';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Activity } from 'lucide-react';

import { InstitutionApplications } from '@/components/admin/InstitutionApplications';
import { Building2 } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and monitor security events
          </p>
        </div>
        <Shield className="h-12 w-12 text-primary" />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Test Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <InstitutionApplications />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <SecurityAuditLogs />
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Account Setup</CardTitle>
              <CardDescription>
                Create test accounts for development and testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestAccountSetup />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
