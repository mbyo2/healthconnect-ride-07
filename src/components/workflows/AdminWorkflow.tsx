import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useUserRoles } from '@/context/UserRolesContext';
import {
  ShieldCheck, Users, Settings, BarChart3, FileCheck,
  CreditCard, Building2, UserPlus, Activity, ClipboardList,
  Bell, Bug, Shield, MessageSquare, Brain
} from 'lucide-react';

export const AdminWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isSuperAdmin } = useUserRoles();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const allWorkflowSteps = [
    { title: "User Management", description: "Manage accounts, roles & permissions", icon: <Users className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Provider Applications", description: "Review healthcare provider applications", icon: <FileCheck className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Platform Analytics", description: "Platform metrics, growth & reports", icon: <BarChart3 className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Financial Overview", description: "Revenue, payments & billing reports", icon: <CreditCard className="h-5 w-5" />, route: '/wallet', requiredSuperAdmin: false },
    { title: "Institutions", description: "Healthcare facility management & verification", icon: <Building2 className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Clinical Safety Oversight", description: "Allergy alerts & drug interaction reports", icon: <Shield className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Infection Surveillance", description: "Platform-wide HAI tracking & reports", icon: <Bug className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Notification Management", description: "Platform-wide announcements & alerts", icon: <Bell className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Patient Feedback", description: "Satisfaction scores & improvement areas", icon: <MessageSquare className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "AI Diagnostics Monitor", description: "AI usage, accuracy & audit trail", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics', requiredSuperAdmin: false },
    { title: "Audit Logs", description: "System activity & change history", icon: <ClipboardList className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: false },
    { title: "Role Management", description: "Assign and manage user roles", icon: <Activity className="h-5 w-5" />, route: '/role-management', requiredSuperAdmin: true },
    { title: "Create Admin", description: "Create new admin accounts", icon: <UserPlus className="h-5 w-5" />, route: '/create-admin', requiredSuperAdmin: true },
    { title: "Security & Compliance", description: "Password policies, fraud alerts & security events", icon: <ShieldCheck className="h-5 w-5" />, route: '/admin-dashboard', requiredSuperAdmin: true },
    { title: "Settings", description: "Platform configuration & preferences", icon: <Settings className="h-5 w-5" />, route: '/settings', requiredSuperAdmin: false },
  ];

  const workflowSteps = allWorkflowSteps.filter(step =>
    !step.requiredSuperAdmin || isSuperAdmin
  );

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {isSuperAdmin ? "Super Admin Control Center" : "Admin Control Center"}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage the platform, clinical safety, users, and ensure smooth operations
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" className="w-full text-xs mt-2">Manage</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
