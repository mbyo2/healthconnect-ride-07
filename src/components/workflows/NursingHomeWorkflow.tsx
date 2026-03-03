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
  Settings,
  BarChart3,
  Bed,
  Heart,
  Pill,
  DollarSign,
  ClipboardList,
  Thermometer,
  Activity,
  Home,
  AlertTriangle,
  Utensils
} from 'lucide-react';

export const NursingHomeWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "Facility Dashboard",
      description: "Occupancy, alerts & daily overview",
      icon: <Building2 className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Resident Registry",
      description: "Admissions, discharges & resident profiles",
      icon: <Users className="h-5 w-5" />,
      route: '/institution/patients',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Bed & Room Management",
      description: "Room assignments, availability & maintenance",
      icon: <Bed className="h-5 w-5" />,
      route: '/hospital-management',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Daily Care Plans",
      description: "Individual care plans & daily activity logs",
      icon: <Heart className="h-5 w-5" />,
      route: '/medical-records',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Vitals Monitoring",
      description: "Track resident vitals, BP, sugar & weight",
      icon: <Thermometer className="h-5 w-5" />,
      route: '/medical-records',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Medication Rounds",
      description: "Medication schedules & administration tracking",
      icon: <Pill className="h-5 w-5" />,
      route: '/medications',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Staff Roster & Shifts",
      description: "Nurse & caregiver duty assignments",
      icon: <ClipboardList className="h-5 w-5" />,
      route: '/institution/personnel',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Appointments & Visits",
      description: "Doctor visits, family visits & therapy sessions",
      icon: <Calendar className="h-5 w-5" />,
      route: '/institution/appointments',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Incident Reports",
      description: "Falls, emergencies & incident documentation",
      icon: <AlertTriangle className="h-5 w-5" />,
      route: '/emergency',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Billing & Family Payments",
      description: "Invoices, family billing & insurance",
      icon: <DollarSign className="h-5 w-5" />,
      route: '/wallet',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Reports & Analytics",
      description: "Occupancy, care quality & compliance reports",
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/institution/reports',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    },
    {
      title: "Settings",
      description: "Facility preferences & configuration",
      icon: <Settings className="h-5 w-5" />,
      route: '/institution/settings',
      color: 'bg-rose-500/10 dark:bg-rose-500/20'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Nursing Home Management</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Resident care, staff management, and facility operations
        </p>
      </div>

      {/* Quick Access to full management */}
      <div className="flex justify-center">
        <Button size="lg" onClick={() => handleNavigation('/hospital-management', 'Facility Dashboard')} className="gap-2">
          <Building2 className="h-5 w-5" />
          Open Full Facility Dashboard
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 ${step.color} rounded-lg flex-shrink-0`}>
                  {step.icon}
                </div>
                <CardTitle className="text-xs leading-tight text-foreground">{step.title}</CardTitle>
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
