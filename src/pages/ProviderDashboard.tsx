import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { WaitlistManager } from "@/components/provider/WaitlistManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";
import { PatientRecords } from "@/components/provider/PatientRecords";
import { ProviderAnalyticsDashboard } from "@/components/provider/ProviderAnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, Bot, Brain, Sparkles, ArrowRight, BarChart3, 
  Calendar, Users, Clock, FileText, Video, Stethoscope,
  ClipboardList, AlertTriangle, Wallet, MessageSquare,
  TrendingUp, CheckCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const today = new Date();

  // Fetch today's appointments
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['provider-today-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from('appointments')
        .select(`
          id, date, time, status, type,
          patient:profiles!appointments_patient_id_fkey (first_name, last_name)
        `)
        .eq('provider_id', user.id)
        .eq('date', format(today, 'yyyy-MM-dd'))
        .order('time');
      
      return data || [];
    }
  });

  // Fetch week's statistics
  const { data: weekStats } = useQuery({
    queryKey: ['provider-week-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { total: 0, completed: 0, pending: 0, revenue: 0 };

      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('provider_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      const appointments = data || [];
      return {
        total: appointments.length,
        completed: appointments.filter(a => a.status === 'completed').length,
        pending: appointments.filter(a => a.status === 'scheduled').length,
        revenue: appointments.filter(a => a.status === 'completed').length * 150 // Placeholder
      };
    }
  });

  const scheduledToday = todayAppointments.filter((a: any) => a.status === 'scheduled');
  const completedToday = todayAppointments.filter((a: any) => a.status === 'completed');

  const quickActions = [
    { icon: Calendar, label: "My Schedule", route: "/provider-calendar", color: "text-blue-600 bg-blue-500/10" },
    { icon: ClipboardList, label: "Patient Queue", route: "/appointments", color: "text-purple-600 bg-purple-500/10" },
    { icon: FileText, label: "Write Prescription", route: "/prescriptions", color: "text-emerald-600 bg-emerald-500/10" },
    { icon: Video, label: "Video Consult", route: "/video-consultations", color: "text-orange-600 bg-orange-500/10" },
    { icon: Stethoscope, label: "Medical Records", route: "/medical-records", color: "text-pink-600 bg-pink-500/10" },
    { icon: MessageSquare, label: "Patient Chat", route: "/chat", color: "text-cyan-600 bg-cyan-500/10" },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Provider Dashboard</h1>
          <p className="text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/ai-diagnostics')} className="gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
          <Button onClick={() => navigate('/provider-calendar')} className="gap-2">
            <Calendar className="h-4 w-4" />
            View Calendar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Patients</p>
                <p className="text-2xl font-bold text-foreground">{todayAppointments.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {scheduledToday.length} pending • {completedToday.length} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Week's Total</p>
                <p className="text-2xl font-bold text-foreground">{weekStats?.total || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {weekStats?.completed || 0} completed this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground">{weekStats?.pending || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting consultation
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Week's Revenue</p>
                <p className="text-2xl font-bold text-foreground">K{weekStats?.revenue || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +12% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {quickActions.map((action, idx) => (
          <Card 
            key={idx} 
            className="cursor-pointer hover:shadow-md transition-all active:scale-95"
            onClick={() => navigate(action.route)}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-2`}>
                <action.icon className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-foreground">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Clinical Decision Support Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">Clinical Decision Support AI</h3>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Get AI-powered clinical insights, analyze patient symptoms, review medical images, and receive evidence-based recommendations.
              </p>
            </div>
            <Button onClick={() => navigate('/ai-diagnostics')} className="w-full sm:w-auto gap-2">
              Open AI Console
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Today's Patient Queue
            </CardTitle>
            <CardDescription>Manage your appointments for {format(today, 'MMMM d')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/appointments')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No appointments scheduled for today</p>
              <Button variant="link" onClick={() => navigate('/provider-calendar')}>
                View your calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.slice(0, 5).map((appointment: any) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.time} • {appointment.type === 'video_consultation' ? 'Video' : 'In-Person'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={appointment.status === 'completed' ? 'outline' : 'default'}
                      className={appointment.status === 'scheduled' ? 'bg-blue-500' : ''}
                    >
                      {appointment.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => navigate(`/appointments/${appointment.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
              {todayAppointments.length > 5 && (
                <Button variant="link" className="w-full" onClick={() => navigate('/appointments')}>
                  View all {todayAppointments.length} appointments
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs for Detailed Management */}
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-3 w-3" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleManager />
        </TabsContent>

        <TabsContent value="patients">
          <PatientRecords />
        </TabsContent>

        <TabsContent value="waitlist">
          <WaitlistManager />
        </TabsContent>

        <TabsContent value="analytics">
          <ProviderAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="signatures">
          <DigitalSignature />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderDashboard;
