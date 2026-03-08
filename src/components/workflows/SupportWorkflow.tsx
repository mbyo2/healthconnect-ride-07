import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import {
  Headphones, MessageSquare, Users, Search, FileText,
  Settings, ShieldCheck, ClipboardList, BarChart3
} from 'lucide-react';

export const SupportWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "Support Dashboard", description: "Ticket queue & escalation overview", icon: <Headphones className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "User Lookup", description: "Find user accounts & history", icon: <Search className="h-5 w-5" />, route: '/search' },
    { title: "Live Chat Support", description: "Real-time user assistance", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Provider Applications", description: "Review healthcare applications", icon: <FileText className="h-5 w-5" />, route: '/healthcare-application' },
    { title: "User Accounts", description: "Account status & management", icon: <Users className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Audit Trail", description: "View system activity logs", icon: <ClipboardList className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Security Events", description: "Fraud alerts & suspicious activity", icon: <ShieldCheck className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Insurance Support", description: "Help users with insurance issues", icon: <CreditCard className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Waitlist Issues", description: "Manage waitlist complaints & escalations", icon: <Bell className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Support Analytics", description: "Ticket volume & resolution metrics", icon: <BarChart3 className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "Settings", description: "Support preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Support Center</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          User assistance, ticket management & platform support
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-sky-500/10 dark:bg-sky-500/20 rounded-lg shrink-0">
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
