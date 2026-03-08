import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import {
  Stethoscope, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Brain, Wallet, AlertTriangle,
  Shield, Bug, Pill, Video, Activity, Megaphone, Code2, Bell
} from 'lucide-react';

export const DoctorWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "My Schedule", description: "Availability, appointments & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's consultations & upcoming visits", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records (EMR)", description: "Access case sheets, vitals & history", icon: <Stethoscope className="h-5 w-5" />, route: '/medical-records' },
    { title: "Write Prescriptions", description: "Digital Rx with allergy & interaction alerts", icon: <FileText className="h-5 w-5" />, route: '/prescriptions' },
    { title: "Allergy & Drug Safety", description: "Check allergies & drug interactions", icon: <Shield className="h-5 w-5" />, route: '/prescriptions' },
    { title: "AI Clinical Assistant", description: "AI-powered CDSS & diagnostic support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Infection Management", description: "Track HAI cases & antibiotic stewardship", icon: <Bug className="h-5 w-5" />, route: '/medical-records' },
    { title: "Discharge Planning", description: "Multi-dept discharge checklists", icon: <ClipboardList className="h-5 w-5" />, route: '/medical-records' },
    { title: "Video Consultations", description: "Telemedicine & remote patient care", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected patient network", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging with patients", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Medication Management", description: "Review active medications & refills", icon: <Pill className="h-5 w-5" />, route: '/medications' },
    { title: "Health Analytics", description: "Patient trends & outcomes", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    { title: "Earnings & Wallet", description: "Consultation revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' },
    { title: "Emergency Protocols", description: "Emergency response tools", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Professional Profile", description: "Credentials, specializations & bio", icon: <Stethoscope className="h-5 w-5" />, route: '/profile' },
    { title: "Promote Practice", description: "Sponsored listings & growth tools", icon: <Megaphone className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Booking Widget", description: "Embed booking on your website", icon: <Code2 className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Patient Waitlist", description: "Manage waitlisted patients", icon: <Bell className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Appointment Reminders", description: "Automated SMS/email reminders", icon: <Bell className="h-5 w-5" />, route: '/appointments' },
    { title: "Insurance Verification", description: "Verify patient insurance cards", icon: <Shield className="h-5 w-5" />, route: '/appointments' },
    { title: "Cost Estimation", description: "Pre-visit cost transparency", icon: <Wallet className="h-5 w-5" />, route: '/appointments' },
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Doctor Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Clinical tools, prescriptions, patient management & decision support
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
              <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" className="w-full text-xs mt-2">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
