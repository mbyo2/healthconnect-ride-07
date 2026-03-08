import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Calendar, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface WaitlistEntry {
  id: string;
  patient_id: string;
  provider_id: string;
  preferred_times: string[];
  urgency: string;
  status: string;
  notes: string | null;
  created_at: string;
  patient?: { first_name: string; last_name: string; email: string };
}

export const WaitlistManager = () => {
  const { user } = useAuth();

  const { data: waitlistEntries = [] } = useQuery({
    queryKey: ['provider-waitlist', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('appointment_waitlist')
        .select('*')
        .eq('provider_id', user!.id)
        .in('status', ['waiting', 'notified'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as WaitlistEntry[];
    },
    enabled: !!user,
  });

  const urgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600 bg-red-500/10';
      case 'soon': return 'text-amber-600 bg-amber-500/10';
      default: return 'text-blue-600 bg-blue-500/10';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-primary" />
          Patient Waitlist
          {waitlistEntries.length > 0 && (
            <Badge variant="secondary" className="ml-2">{waitlistEntries.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {waitlistEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No patients on waitlist</p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitlistEntries.map(entry => (
              <div key={entry.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {entry.patient?.first_name} {entry.patient?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${urgencyColor(entry.urgency)}`}>
                      {entry.urgency === 'urgent' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {entry.urgency}
                    </Badge>
                    <Badge variant={entry.status === 'notified' ? 'default' : 'outline'} className="text-xs">
                      {entry.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {entry.preferred_times?.join(', ') || 'Any time'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Added {format(new Date(entry.created_at), 'MMM d')}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground bg-background p-2 rounded">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
