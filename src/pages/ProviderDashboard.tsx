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
  Bot, Brain, Sparkles, ArrowRight, BarChart3, 
  Calendar, Users, Clock, FileText, Video, Stethoscope,
  ClipboardList, Wallet, MessageSquare,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const today = new Date();

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['provider-today-appointments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('appointments')
        .select(`id, date, time, status, type, patient:profiles!appointments_patient_id_fkey (first_name, last_name)`)
        .eq('provider_id', user.id)
        .eq('date', format(today, 'yyyy-MM-dd'))
        .order('time');
      return data || [];
    }
  });

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
        revenue: appointments.filter(a => a.status === 'completed').length * 150
      };
    }
  });

  const scheduledToday = todayAppointments.filter((a: any) => a.status === 'scheduled');
  const completedToday = todayAppointments.filter((a: any) => a.status === 'completed');

  const quickActions = [
    { icon: Calendar, label: "Schedule", route: "/provider-calendar", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    { icon: ClipboardList, label: "Queue", route: "/appointments", color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
    { icon: FileText, label: "Prescribe", route: "/prescriptions", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { icon: Video, label: "Video", route: "/video-consultations", color: "text-orange-600 dark:text-orange-400 bg-orange-500/10" },
    { icon: Stethoscope, label: "Records", route: "/medical-records", color: "text-pink-600 dark:text-pink-400 bg-pink-500/10" },
    { icon: MessageSquare, label: "Chat", route: "/chat", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10" },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Provider Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/ai-diagnostics')} className="gap-1.5 text-xs">
            <Bot className="h-3.5 w-3.5" /> AI Assistant
          </Button>
          <Button size="sm" onClick={() => navigate('/provider-calendar')} className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Calendar
          </Button>
        </div>
      </div>

      {/* Stats — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {[
          { label: "Today", value: todayAppointments.length, sub: `${scheduledToday.length} pending · ${completedToday.length} done`, icon: Users, color: "border-l-blue-500", iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400" },
          { label: "This Week", value: weekStats?.total || 0, sub: `${weekStats?.completed || 0} completed`, icon: TrendingUp, color: "border-l-emerald-500", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", value: weekStats?.pending || 0, sub: "Awaiting consult", icon: Clock, color: "border-l-orange-500", iconBg: "bg-orange-500/10", iconColor: "text-orange-600 dark:text-orange-400" },
          { label: "Revenue", value: `K${weekStats?.revenue || 0}`, sub: "+12% vs last week", icon: Wallet, color: "border-l-purple-500", iconBg: "bg-purple-500/10", iconColor: "text-purple-600 dark:text-purple-400" },
        ].map((stat) => (
          <Card key={stat.label} className={`border-l-4 ${stat.color} min-w-[160px] flex-1 snap-start`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.iconBg} shrink-0`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions — 2-col mobile, 3-col sm, 6-col md */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {quickActions.map((action, idx) => (
          <Card 
            key={idx} 
            className="cursor-pointer hover:shadow-md transition-all active:scale-95"
            onClick={() => navigate(action.route)}
          >
            <CardContent className="p-3 sm:p-4 flex items-center sm:flex-col sm:text-center gap-3 sm:gap-0">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${action.color} flex items-center justify-center shrink-0 sm:mx-auto sm:mb-2`}>
                <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <p className="text-xs font-medium text-foreground">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-primary/20 shrink-0">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-semibold text-sm text-foreground">Clinical AI</h3>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                AI-powered clinical insights and evidence-based recommendations.
              </p>
              <Button size="sm" onClick={() => navigate('/ai-diagnostics')} className="gap-1.5 text-xs">
                Open <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                Today's Queue
              </CardTitle>
              <CardDescription className="text-xs">{format(today, 'MMMM d')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/appointments')} className="text-xs">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No appointments today</p>
              <Button variant="link" size="sm" onClick={() => navigate('/provider-calendar')} className="text-xs">
                View calendar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.slice(0, 8).map((appointment: any) => (
                <div 
                  key={appointment.id} 
                  className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {appointment.patient?.first_name?.[0]}{appointment.patient?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {appointment.patient?.first_name} {appointment.patient?.last_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {appointment.time} · {appointment.type === 'video_consultation' ? 'Video' : 'In-Person'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge 
                      variant={appointment.status === 'completed' ? 'outline' : 'default'}
                      className={`text-[10px] px-1.5 py-0.5 ${appointment.status === 'scheduled' ? 'bg-blue-500' : ''}`}
                    >
                      {appointment.status}
                    </Badge>
                    {appointment.status === 'scheduled' && appointment.type === 'video_consultation' && (
                      <Button 
                        size="sm" 
                        className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(`/video-call/${appointment.id}`); }}
                      >
                        <Video className="h-3 w-3" /> Start
                      </Button>
                    )}
                    {appointment.status === 'scheduled' && appointment.type !== 'video_consultation' && (
                      <Button 
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(`/appointments/${appointment.id}`); }}
                      >
                        <Stethoscope className="h-3 w-3" /> Go
                      </Button>
                    )}
                    {appointment.status !== 'scheduled' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => navigate(`/appointments/${appointment.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {todayAppointments.length > 8 && (
                <Button variant="link" className="w-full text-xs" onClick={() => navigate('/appointments')}>
                  View all {todayAppointments.length} appointments
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs — scrollable on mobile */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="w-full overflow-x-auto flex justify-start gap-1 h-auto p-1">
          <TabsTrigger value="schedule" className="text-xs px-3 py-1.5 shrink-0">Schedule</TabsTrigger>
          <TabsTrigger value="patients" className="text-xs px-3 py-1.5 shrink-0">Patients</TabsTrigger>
          <TabsTrigger value="waitlist" className="text-xs px-3 py-1.5 shrink-0">Waitlist</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs px-3 py-1.5 shrink-0 gap-1">
            <BarChart3 className="h-3 w-3" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="signatures" className="text-xs px-3 py-1.5 shrink-0">Signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule"><ScheduleManager /></TabsContent>
        <TabsContent value="patients"><PatientRecords /></TabsContent>
        <TabsContent value="waitlist"><WaitlistManager /></TabsContent>
        <TabsContent value="analytics"><ProviderAnalyticsDashboard /></TabsContent>
        <TabsContent value="signatures"><DigitalSignature /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderDashboard;
