import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Activity, FileText, Search, Settings, BarChart3,
  Users, ClipboardList, TestTube, AlertTriangle, Wallet, Timer
} from 'lucide-react';

export const LabWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "Lab Dashboard", description: "Pending tests, stats & workload overview", icon: <Activity className="h-5 w-5" />, route: '/lab-management' },
    { title: "Test Requests", description: "View and process lab test orders", icon: <ClipboardList className="h-5 w-5" />, route: '/lab-management' },
    { title: "Sample Tracking", description: "Track sample collection and processing", icon: <TestTube className="h-5 w-5" />, route: '/lab-management' },
    { title: "Pending Sample Alerts", description: "Samples pending >1hr flagged for action", icon: <Timer className="h-5 w-5" />, route: '/lab-management' },
    { title: "Critical Results", description: "Abnormal values & reflex test triggers", icon: <AlertTriangle className="h-5 w-5" />, route: '/lab-management' },
    { title: "Results & Reports", description: "Enter results and generate reports", icon: <FileText className="h-5 w-5" />, route: '/medical-records' },
    { title: "Quality Control", description: "QC logs, calibration & NABL compliance", icon: <ClipboardList className="h-5 w-5" />, route: '/lab-management' },
    { title: "Patient Lookup", description: "Search patient records and history", icon: <Search className="h-5 w-5" />, route: '/search' },
    { title: "Staff", description: "Lab technician management", icon: <Users className="h-5 w-5" />, route: '/lab-management' },
    { title: "TAT Analytics", description: "Turnaround time & performance metrics", icon: <BarChart3 className="h-5 w-5" />, route: '/lab-management' },
    { title: "Earnings & Wallet", description: "Revenue & payment management", icon: <Wallet className="h-5 w-5" />, route: '/wallet' },
    { title: "Settings", description: "Lab preferences and configuration", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Laboratory Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Sample processing, quality control, TAT tracking & NABL compliance
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
              <Button onClick={() => handleNavigation(step.route, step.title)}
                size="sm" className="w-full text-xs mt-2">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
