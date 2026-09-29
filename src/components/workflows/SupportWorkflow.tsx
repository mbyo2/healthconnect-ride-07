import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import {
  Headphones, MessageSquare, Search, FileText,
  Settings, Calendar
} from 'lucide-react';

export const SupportWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  // Every card routes to a real, support-accessible destination. Cards that
  // pointed at bare /admin-dashboard (no such tab exists) or at admin-only
  // tabs (RLS denies support on application/security/audit tables) are gone.
  const workflowSteps = [
    { title: "Support Dashboard", description: "Your support center home", icon: <Headphones className="h-5 w-5" />, route: '/admin-dashboard' },
    { title: "User Lookup", description: "Find user accounts & history", icon: <Search className="h-5 w-5" />, route: '/search' },
    { title: "Live Chat Support", description: "Real-time user assistance", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Appointments", description: "View appointments for support", icon: <Calendar className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records", description: "View patient records", icon: <FileText className="h-5 w-5" />, route: '/medical-records' },
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
