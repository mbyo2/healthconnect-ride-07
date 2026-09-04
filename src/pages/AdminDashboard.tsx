import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/UserManagement";
import { SecurityAuditLogs } from "@/components/admin/SecurityAuditLogs";
import { TestAccountSetup } from "@/components/admin/TestAccountSetup";
import { RevenueAnalyticsDashboard } from "@/components/admin/RevenueAnalyticsDashboard";
import { InstitutionApplications } from "@/components/admin/InstitutionApplications";
import { ProviderApplications } from "@/components/admin/ProviderApplications";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { PromoCodeManager } from "@/components/admin/PromoCodeManager";
import { CommissionSettings } from "@/components/admin/CommissionSettings";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield, Users, Activity, DollarSign, Building2, Stethoscope,
  UserCog, Ticket, Percent, Lock, Sparkles, RefreshCw
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const TABS = [
  { value: "users", label: "Users", icon: Users },
  { value: "roles", label: "Roles", icon: UserCog },
  { value: "providers", label: "Providers", icon: Stethoscope },
  { value: "applications", label: "Institutions", icon: Building2 },
  { value: "revenue", label: "Revenue", icon: DollarSign },
  { value: "commissions", label: "Commissions", icon: Percent },
  { value: "promos", label: "Promos", icon: Ticket },
  { value: "security", label: "Security", icon: Lock },
  { value: "audit", label: "Audit Logs", icon: Activity },
  { value: "test", label: "Test Setup", icon: Shield },
];

export const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "users";
  const setTab = (v: string) => setSearchParams({ tab: v });

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      {/* Top Bar */}
      <div className="bg-white border-b border-canvas-silk px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
                Executive Admin WorkOS
                <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
              </h1>
              <p className="text-sm text-graphite-500 font-medium tracking-wide">
                System-wide governance, security audit logs, platform revenue & accreditation controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-pill text-xs font-medium text-white bg-success-500">
              Active System Governance
            </span>
          </div>
        </div>
      </div>

      {/* Main Board Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setTab} className="space-y-4">
          <div className="overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-[#e6e9ef] dark:border-slate-800">
            <TabsList className="inline-flex w-auto min-w-full flex-wrap h-auto gap-1 bg-transparent p-1">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="text-xs font-extrabold px-3.5 py-1.5 rounded-md data-[state=active]:bg-[#0073ea] data-[state=active]:text-white flex items-center gap-1.5 transition-all"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs">
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
              <div className="space-y-2">
                <h3 className="font-extrabold text-base">Test Account Diagnostics</h3>
                <p className="text-xs text-[#676879]">Create test credentials for development and QA validation</p>
                <TestAccountSetup />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
