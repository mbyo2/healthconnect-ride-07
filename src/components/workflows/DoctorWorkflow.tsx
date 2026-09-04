import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import {
  Stethoscope, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Brain, Wallet, AlertTriangle,
  Shield, Bug, Pill, Video, Activity, Megaphone, Code2, Bell
} from 'lucide-react';

export const DoctorWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

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
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Consultation revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
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
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header Banner */}
      <div className="rounded-3xl bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-md">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Doctor Clinical Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Physician Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">
              Clinical operations, patient queue, digital prescriptions &amp; CDSS tools
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <div
            key={index}
            className="group cursor-pointer rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-[#0073ea] hover:shadow-md transition-all active:scale-[0.98] touch-manipulation flex flex-col justify-between"
            onClick={() => handleNavigation(step.route, step.title)}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-[#e5f0ff] dark:bg-blue-950/60 text-[#0073ea] dark:text-blue-400 rounded-xl shrink-0 group-hover:bg-[#0073ea] group-hover:text-white transition-colors">
                  {step.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-[#0073ea] transition-colors truncate">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{step.description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
              className="w-full mt-2 py-1.5 rounded-xl bg-[#f5f7fa] dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-[#0073ea] group-hover:text-white text-[11px] font-black transition-all"
            >
              Open Module
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
