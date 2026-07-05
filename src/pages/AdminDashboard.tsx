import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { SecurityAuditLogs } from '@/components/admin/SecurityAuditLogs';
import { TestAccountSetup } from '@/components/admin/TestAccountSetup';
import { RevenueAnalyticsDashboard } from '@/components/admin/RevenueAnalyticsDashboard';
import { InstitutionApplications } from '@/components/admin/InstitutionApplications';
import { ProviderApplications } from '@/components/admin/ProviderApplications';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { PromoCodeManager } from '@/components/admin/PromoCodeManager';
import { CommissionSettings } from '@/components/admin/CommissionSettings';
import { SecurityDashboard } from '@/components/admin/SecurityDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield, Users, Activity, DollarSign, Building2, Stethoscope,
  UserCog, Ticket, Percent, Lock,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const TABS = [
  { value: 'users', label: 'Users', icon: Users },
  { value: 'roles', label: 'Roles', icon: UserCog },
  { value: 'providers', label: 'Providers', icon: Stethoscope },
  { value: 'applications', label: 'Institutions', icon: Building2 },
  { value: 'revenue', label: 'Revenue', icon: DollarSign },
  { value: 'commissions', label: 'Commissions', icon: Percent },
  { value: 'promos', label: 'Promos', icon: Ticket },
  { value: 'security', label: 'Security', icon: Lock },
  { value: 'audit', label: 'Audit', icon: Activity },
  { value: 'test', label: 'Test', icon: Shield },
];

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const setTab = (v: string) => setSearchParams({ tab: v });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, revenue, promotions and security
          </p>
        </div>
        <Shield className="h-12 w-12 text-primary" />
      </div>

      <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-2">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="roles"><RoleManagement /></TabsContent>
        <TabsContent value="providers"><ProviderApplications /></TabsContent>
        <TabsContent value="applications"><InstitutionApplications /></TabsContent>
        <TabsContent value="revenue"><RevenueAnalyticsDashboard /></TabsContent>
        <TabsContent value="commissions"><CommissionSettings /></TabsContent>
        <TabsContent value="promos"><PromoCodeManager /></TabsContent>
        <TabsContent value="security"><SecurityDashboard /></TabsContent>
        <TabsContent value="audit"><SecurityAuditLogs /></TabsContent>
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Account Setup</CardTitle>
              <CardDescription>Create test accounts for development and testing</CardDescription>
            </CardHeader>
            <CardContent><TestAccountSetup /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
