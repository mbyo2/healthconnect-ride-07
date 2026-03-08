import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, isPast, isFuture } from 'date-fns';

interface Reminder {
  id: string;
  appointment_id: string;
  patient_id: string;
  reminder_type: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  message_content: string | null;
  appointments?: {
    date: string;
    time: string;
    type: string;
    provider?: { first_name: string; last_name: string; specialty: string };
  };
}

export const AppointmentReminders = () => {
  const { user } = useAuth();

  const { data: reminders = [] } = useQuery({
    queryKey: ['appointment-reminders', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('appointment_reminders')
        .select(`
          *,
          appointments (
            date, time, type,
            provider:profiles!appointments_provider_id_fkey (first_name, last_name, specialty)
          )
        `)
        .eq('patient_id', user!.id)
        .order('scheduled_for', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as Reminder[];
    },
    enabled: !!user,
  });

  const upcomingReminders = reminders.filter(r => r.status === 'pending' && isFuture(new Date(r.scheduled_for)));
  const pastReminders = reminders.filter(r => r.status === 'sent' || isPast(new Date(r.scheduled_for)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Appointment Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming reminders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingReminders.map(reminder => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Clock className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{reminder.message_content}</p>
                  {reminder.appointments && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dr. {reminder.appointments.provider?.first_name} {reminder.appointments.provider?.last_name} • {reminder.appointments.date} at {reminder.appointments.time}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Scheduled: {format(new Date(reminder.scheduled_for), 'MMM d, h:mm a')}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />Pending
                </Badge>
              </div>
            ))}
            {pastReminders.slice(0, 5).map(reminder => (
              <div key={reminder.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg opacity-60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{reminder.message_content}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {reminder.sent_at ? format(new Date(reminder.sent_at), 'MMM d, h:mm a') : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
