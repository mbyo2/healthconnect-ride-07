import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Building2, Users, Calendar, Package,
  BarChart3, Bed, Stethoscope, Scissors, DollarSign, ClipboardList,
  Wifi, Bug, Bell, MessageSquare, AlertTriangle, CreditCard
} from 'lucide-react';

export const InstitutionStaffWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  // Staff-level items: NO Settings, Compliance, Promoted Listings, Security Management, Staff Invite
  const workflowSteps = [
    { title: "HMS Dashboard", description: "Hospital management overview", icon: <Building2 className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Staff Directory", description: "View hospital personnel", icon: <Users className="h-5 w-5" />, route: '/institution/personnel' },
    { title: "Connected Devices", description: "IoT machines, vitals & analyzers", icon: <Wifi className="h-5 w-5" />, route: '/institution/devices' },
    { title: "OPD Management", description: "Outpatient queue & token system", icon: <Stethoscope className="h-5 w-5" />, route: '/hospital-management' },
    { title: "IPD / Admissions", description: "Admit, discharge & transfer patients", icon: <Bed className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Operation Theatre", description: "OT scheduling & consent forms", icon: <Scissors className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Discharge Checklists", description: "Multi-dept sign-off before discharge", icon: <ClipboardList className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Infection Control", description: "HAI tracking & surveillance", icon: <Bug className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Notifications", description: "Hospital alerts & communications", icon: <Bell className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Patient Feedback", description: "Post-discharge surveys", icon: <MessageSquare className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Duty Roster", description: "View shift schedules", icon: <Calendar className="h-5 w-5" />, route: '/institution/personnel' },
    { title: "Billing & Invoices", description: "Generate invoices with insurance", icon: <DollarSign className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Appointments", description: "View & manage appointments", icon: <Calendar className="h-5 w-5" />, route: '/institution/appointments' },
    { title: "Patient Records", description: "View patient records", icon: <ClipboardList className="h-5 w-5" />, route: '/institution/patients' },
    { title: "Inventory", description: "Medical supplies & equipment", icon: <Package className="h-5 w-5" />, route: '/pharmacy-inventory' },
    { title: "Reports", description: "Performance & financial reports", icon: <BarChart3 className="h-5 w-5" />, route: '/institution/reports' },
    { title: "Insurance Verification", description: "Verify patient insurance", icon: <CreditCard className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Patient Waitlist", description: "Manage waitlist", icon: <Bell className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Emergency Protocols", description: "A&E triage & emergency response", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Institution Staff Portal</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Access clinical tools, patient records, scheduling & operational modules
        </p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => handleNavigation('/hospital-management', 'HMS Dashboard')} className="gap-2">
          <Building2 className="h-5 w-5" /> Open HMS Dashboard
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg shrink-0">{step.icon}</div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }} size="sm" className="w-full text-xs mt-2" variant="outline">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
