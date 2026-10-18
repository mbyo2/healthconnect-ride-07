import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useUserRoles } from '@/context/UserRolesContext';
import { SupportTicketSystem } from '@/components/support/SupportTicketSystem';
import {
  Headphones, MessageSquare, Search, FileText,
  Settings, Calendar, BookOpen, Ticket
} from 'lucide-react';

export const SupportWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { availableRoles } = useUserRoles();
  const [activeTab, setActiveTab] = useState('tickets');

  const isStaff = useMemo(
    () => availableRoles.some((r) => ['support', 'admin', 'super_admin'].includes(r)),
    [availableRoles]
  );

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const quickLinks = [
    { title: "User Lookup", description: "Find user accounts & history", icon: <Search className="h-5 w-5" />, route: '/search' },
    { title: "Live Chat Support", description: "Real-time user assistance", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Appointments", description: "View appointments for support", icon: <Calendar className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records", description: "View patient records", icon: <FileText className="h-5 w-5" />, route: '/institution/patients' },
    { title: "Settings", description: "Support preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Headphones className="h-6 w-6 text-primary" /> Support Center
        </h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Real ticket management, user assistance & platform support
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
          <TabsTrigger value="tickets" className="gap-1.5">
            <Ticket className="h-4 w-4" /> {isStaff ? 'All Tickets' : 'My Tickets'}
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5">
            <MessageSquare className="h-4 w-4" /> Quick Links
          </TabsTrigger>
          <TabsTrigger value="kb" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4">
          <SupportTicketSystem showAll={isStaff} />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((step, index) => (
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
        </TabsContent>

        <TabsContent value="kb" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-base font-semibold mb-1">Knowledge Base — coming soon</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Self-help articles and troubleshooting guides are on the roadmap.
                For now, open a ticket and our support team will help you directly.
              </p>
              <Button className="mt-4" onClick={() => setActiveTab('tickets')}>Open a Ticket</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
