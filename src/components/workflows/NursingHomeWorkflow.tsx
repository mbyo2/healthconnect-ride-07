import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Building2, Users, Calendar, FileText, Settings,
  BarChart3, Bed, Heart, Pill, DollarSign, ClipboardList,
  Thermometer, Activity, AlertTriangle, Bug, Shield, Bell
} from 'lucide-react';

export const NursingHomeWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "Facility Dashboard", description: "Occupancy, alerts & daily overview", icon: <Building2 className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Resident Registry", description: "Admissions, discharges & resident profiles", icon: <Users className="h-5 w-5" />, route: '/institution/patients' },
    { title: "Bed & Room Management", description: "Room assignments, availability & maintenance", icon: <Bed className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Daily Care Plans", description: "Individual care plans & daily activity logs", icon: <Heart className="h-5 w-5" />, route: '/medical-records' },
    { title: "Vitals Monitoring", description: "Track resident vitals, BP, sugar & weight", icon: <Thermometer className="h-5 w-5" />, route: '/medical-records' },
    { title: "Medication Rounds", description: "Medication schedules & administration tracking", icon: <Pill className="h-5 w-5" />, route: '/medications' },
    { title: "Allergy Alerts", description: "Resident allergy checks before administration", icon: <Shield className="h-5 w-5" />, route: '/medical-records' },
    { title: "Infection Control", description: "Infection tracking & preventive measures", icon: <Bug className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Discharge Planning", description: "Multi-department discharge checklists", icon: <ClipboardList className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Staff Roster & Shifts", description: "Nurse & caregiver duty assignments", icon: <ClipboardList className="h-5 w-5" />, route: '/institution/personnel' },
    { title: "Appointments & Visits", description: "Doctor visits, family visits & therapy sessions", icon: <Calendar className="h-5 w-5" />, route: '/institution/appointments' },
    { title: "Notifications", description: "Facility-wide alerts & communications", icon: <Bell className="h-5 w-5" />, route: '/hospital-management' },
    { title: "Incident Reports", description: "Falls, emergencies & incident documentation", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Billing & Family Payments", description: "Invoices, family billing & insurance", icon: <DollarSign className="h-5 w-5" />, route: '/wallet' },
    { title: "Reports & Analytics", description: "Occupancy, care quality & compliance reports", icon: <BarChart3 className="h-5 w-5" />, route: '/institution/reports' },
    { title: "Compliance", description: "Regulatory docs & certifications", icon: <FileText className="h-5 w-5" />, route: '/institution/settings' },
    { title: "Settings", description: "Facility preferences & configuration", icon: <Settings className="h-5 w-5" />, route: '/institution/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Nursing Home Management</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Resident care, infection control, staff management & facility operations
        </p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => handleNavigation('/hospital-management', 'Facility Dashboard')} className="gap-2">
          <Building2 className="h-5 w-5" /> Open Full Facility Dashboard
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" className="w-full text-xs mt-2" variant="outline">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
