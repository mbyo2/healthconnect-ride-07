import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  Package, 
  Settings,
  BarChart3,
  Bed,
  Stethoscope,
  Scissors,
  DollarSign,
  ClipboardList
} from 'lucide-react';

export const InstitutionAdminWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "HMS Dashboard",
      description: "Full hospital management overview",
      icon: <Building2 className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-primary/10'
    },
    {
      title: "OPD Management",
      description: "Outpatient queue & token system",
      icon: <Stethoscope className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-primary/10'
    },
    {
      title: "IPD / Admissions",
      description: "Admit, discharge & transfer patients",
      icon: <Bed className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-primary/10'
    },
    {
      title: "Operation Theatre",
      description: "Surgery scheduling & management",
      icon: <Scissors className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-primary/10'
    },
    {
      title: "Staff & Roster",
      description: "Duty roster & personnel management",
      icon: <Users className="h-5 w-5" />,
      route: '/institution/personnel',
      color: 'bg-primary/10'
    },
    {
      title: "Billing & Invoices",
      description: "Generate invoices with insurance",
      icon: <DollarSign className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-primary/10'
    },
    {
      title: "Appointments",
      description: "View & manage appointments",
      icon: <Calendar className="h-5 w-5" />,
      route: '/institution/appointments',
      color: 'bg-primary/10'
    },
    {
      title: "Patient Records",
      description: "View all patient records",
      icon: <ClipboardList className="h-5 w-5" />,
      route: '/institution/patients',
      color: 'bg-primary/10'
    },
    {
      title: "Inventory",
      description: "Medical supplies & equipment",
      icon: <Package className="h-5 w-5" />,
      route: '/pharmacy-inventory',
      color: 'bg-primary/10'
    },
    {
      title: "Reports & Analytics",
      description: "Performance metrics & MIS reports",
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/institution/reports',
      color: 'bg-primary/10'
    },
    {
      title: "Compliance",
      description: "Certifications & regulatory docs",
      icon: <FileText className="h-5 w-5" />,
      route: '/institution/settings',
      color: 'bg-primary/10'
    },
    {
      title: "Settings",
      description: "Institution preferences & hours",
      icon: <Settings className="h-5 w-5" />,
      route: '/institution/settings',
      color: 'bg-primary/10'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold">Hospital Management System</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Complete HMS with OPD, IPD, OT, Billing, Staff Roster & more
        </p>
      </div>

      {/* Quick Access - HMS */}
      <div className="flex justify-center">
        <Button size="lg" onClick={() => handleNavigation('/hospital-management', 'HMS Dashboard')} className="gap-2">
          <Building2 className="h-5 w-5" />
          Open Full HMS Dashboard
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 ${step.color} rounded-lg flex-shrink-0`}>
                  {step.icon}
                </div>
                <CardTitle className="text-xs leading-tight">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-3 leading-tight">
                {step.description}
              </CardDescription>
              <Button 
                onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" 
                className="w-full text-xs"
                variant="outline"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
