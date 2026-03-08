import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Heart, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Wallet, AlertTriangle,
  Activity, Thermometer, Home, Pill, Stethoscope,
  Shield, Bug, Video, Megaphone, Code2, Bell, CreditCard
} from 'lucide-react';

export const NurseWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "My Schedule", description: "Appointments, home visits & shift calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Appointments", description: "Today's consultations and upcoming visits", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Vitals", description: "Record BP, temperature, pulse & vitals", icon: <Thermometer className="h-5 w-5" />, route: '/medical-records' },
    { title: "Care Plans", description: "Create and manage patient care plans", icon: <Heart className="h-5 w-5" />, route: '/medical-records' },
    { title: "Allergy Alerts", description: "Patient allergy checks before administration", icon: <Shield className="h-5 w-5" />, route: '/medical-records' },
    { title: "Infection Control", description: "Infection tracking & preventive protocols", icon: <Bug className="h-5 w-5" />, route: '/medical-records' },
    { title: "Home Visit Notes", description: "Document home visit findings & follow-ups", icon: <Home className="h-5 w-5" />, route: '/medical-records' },
    { title: "Medication Administration", description: "Track medication schedules & administration", icon: <Pill className="h-5 w-5" />, route: '/medications' },
    { title: "Wound & Procedure Log", description: "Document wound care, injections & procedures", icon: <Activity className="h-5 w-5" />, route: '/medical-records' },
    { title: "Discharge Checklists", description: "Nursing clearance for patient discharge", icon: <ClipboardList className="h-5 w-5" />, route: '/medical-records' },
    { title: "IoT Vitals Monitor", description: "Real-time device vitals streaming", icon: <Activity className="h-5 w-5" />, route: '/iot-monitoring' },
    { title: "Video Consultations", description: "Telemedicine & remote nursing care", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Your connected patient network", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging with patients & doctors", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Earnings & Wallet", description: "View consultation revenue and payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' },
    { title: "Emergency Protocols", description: "Emergency response & first aid tools", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Promote Practice", description: "Sponsored listings & growth tools", icon: <Megaphone className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Booking Widget", description: "Embed booking on your website", icon: <Code2 className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Patient Waitlist", description: "Manage waitlisted patients", icon: <Bell className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Appointment Reminders", description: "Automated SMS/email reminders", icon: <Bell className="h-5 w-5" />, route: '/appointments' },
    { title: "Insurance Verification", description: "Verify patient insurance cards", icon: <CreditCard className="h-5 w-5" />, route: '/appointments' },
    { title: "Professional Profile", description: "Nursing credentials & certifications", icon: <Stethoscope className="h-5 w-5" />, route: '/profile' },
    { title: "Settings", description: "Consultation & practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Nurse Consultant Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your nursing practice, patient care, and home visits
        </p>
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
              <Button 
                onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" className="w-full text-xs mt-2">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
