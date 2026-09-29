import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import {
  MonitorDot, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Brain, Wallet,
  Image, Scan, Activity, Megaphone, Code2, Bell, CreditCard
} from 'lucide-react';

export const RadiologistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps: Array<{ title: string; description: string; icon: React.ReactNode; route: string; comingSoon?: boolean }> = [
    { title: "My Schedule", description: "Availability & reading slots", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    // Provider imaging worklist (acquire → report → sign) is planned — these
    // tiles are honestly marked instead of routing to unrelated pages.
    { title: "Imaging Queue", description: "Pending reads & urgent cases", icon: <ClipboardList className="h-5 w-5" />, route: '', comingSoon: true },
    { title: "PACS / Image Viewer", description: "View X-ray, CT, MRI & ultrasound studies", icon: <Image className="h-5 w-5" />, route: '', comingSoon: true },
    { title: "AI Imaging Analysis", description: "AI-assisted anomaly detection", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Radiology Reports", description: "Create & sign-off imaging reports", icon: <FileText className="h-5 w-5" />, route: '', comingSoon: true },
    { title: "RIS Dashboard", description: "Radiology information system overview", icon: <MonitorDot className="h-5 w-5" />, route: '', comingSoon: true },
    { title: "Scan Protocols", description: "Manage scan protocols & templates", icon: <Scan className="h-5 w-5" />, route: '', comingSoon: true },
    { title: "Referring Physicians", description: "Communication with ordering doctors", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Patient Records", description: "Clinical context for readings", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Performance Analytics", description: "TAT, volume & accuracy metrics", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Reading fees & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Promote Practice", description: "Sponsored listings & growth tools", icon: <Megaphone className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Booking Widget", description: "Embed booking on your website", icon: <Code2 className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Patient Waitlist", description: "Manage waitlisted patients", icon: <Bell className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Insurance Verification", description: "Verify patient insurance cards", icon: <CreditCard className="h-5 w-5" />, route: '/appointments' },
    { title: "Professional Profile", description: "Credentials & subspecialties", icon: <MonitorDot className="h-5 w-5" />, route: '/profile' },
    { title: "Settings", description: "Display & reading preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Radiologist Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Imaging reads, AI analysis, RIS & reporting
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className={`transition-all bg-card border-border ${step.comingSoon ? "opacity-60" : "cursor-pointer hover:shadow-md active:scale-95 touch-manipulation"}`}
            onClick={() => !step.comingSoon && handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-violet-500/10 dark:bg-violet-500/20 rounded-lg shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                    {step.title}
                    {step.comingSoon && (
                      <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">Soon</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              {!step.comingSoon && (
                <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                  size="sm" className="w-full text-xs mt-2">Open</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
