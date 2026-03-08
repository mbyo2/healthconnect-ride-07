import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Building2, Users, Calendar, FileText, Package, Settings,
  BarChart3, Bed, Stethoscope, Scissors, DollarSign, ClipboardList,
  Radio, UserPlus, Wifi
} from 'lucide-react';

export const InstitutionAdminWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "HMS Dashboard", description: "Full hospital management overview", icon: <Building2 className="h-5 w-5" />, route: '/hospital-management', color: 'bg-primary/10' },
    { title: "Staff & Personnel", description: "All hospital workers, invites & CSV upload", icon: <Users className="h-5 w-5" />, route: '/institution/personnel', color: 'bg-primary/10' },
    { title: "Invite Staff", description: "Send email invitations to new staff", icon: <UserPlus className="h-5 w-5" />, route: '/institution/personnel', color: 'bg-primary/10' },
    { title: "Connected Devices", description: "IoT machines, vitals, lab analyzers & imaging", icon: <Wifi className="h-5 w-5" />, route: '/institution/devices', color: 'bg-primary/10' },
    { title: "OPD Management", description: "Outpatient queue & token system", icon: <Stethoscope className="h-5 w-5" />, route: '/hospital-management', color: 'bg-primary/10' },
    { title: "IPD / Admissions", description: "Admit, discharge & transfer patients", icon: <Bed className="h-5 w-5" />, route: '/hospital-management', color: 'bg-primary/10' },
    { title: "Operation Theatre", description: "Surgery scheduling & management", icon: <Scissors className="h-5 w-5" />, route: '/hospital-management', color: 'bg-primary/10' },
    { title: "Duty Roster", description: "Shift scheduling for all departments", icon: <Calendar className="h-5 w-5" />, route: '/institution/personnel', color: 'bg-primary/10' },
    { title: "Billing & Invoices", description: "Generate invoices with insurance", icon: <DollarSign className="h-5 w-5" />, route: '/hospital-management', color: 'bg-primary/10' },
    { title: "Appointments", description: "View & manage appointments", icon: <Calendar className="h-5 w-5" />, route: '/institution/appointments', color: 'bg-primary/10' },
    { title: "Patient Records", description: "View all patient records", icon: <ClipboardList className="h-5 w-5" />, route: '/institution/patients', color: 'bg-primary/10' },
    { title: "Inventory", description: "Medical supplies & equipment", icon: <Package className="h-5 w-5" />, route: '/pharmacy-inventory', color: 'bg-primary/10' },
    { title: "Reports & Analytics", description: "Performance metrics & MIS reports", icon: <BarChart3 className="h-5 w-5" />, route: '/institution/reports', color: 'bg-primary/10' },
    { title: "Compliance", description: "Certifications & regulatory docs", icon: <FileText className="h-5 w-5" />, route: '/institution/settings', color: 'bg-primary/10' },
    { title: "Settings", description: "Institution preferences & hours", icon: <Settings className="h-5 w-5" />, route: '/institution/settings', color: 'bg-primary/10' }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Hospital Management System</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Complete HMS — Staff, Devices, OPD, IPD, OT, Billing, Roster & more
        </p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => handleNavigation('/hospital-management', 'HMS Dashboard')} className="gap-2">
          <Building2 className="h-5 w-5" /> Open Full HMS Dashboard
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${step.color} rounded-lg shrink-0`}>{step.icon}</div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }} size="sm" className="w-full text-xs mt-2" variant="outline">
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
