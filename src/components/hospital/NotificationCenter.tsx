import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellRing, Check, CheckCheck, AlertTriangle, Info, UserPlus, FileOutput, Pill, TestTube, Scissors, DollarSign, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  hospitalId: string;
}

const categoryIcons: Record<string, any> = {
  admission: UserPlus,
  discharge: FileOutput,
  pharmacy: Pill,
  lab: TestTube,
  ot: Scissors,
  billing: DollarSign,
  security: Shield,
};

const severityStyles: Record<string, string> = {
  info: 'border-l-4 border-l-primary',
  warning: 'border-l-4 border-l-amber-500',
  critical: 'border-l-4 border-l-destructive',
};

export const NotificationCenter = ({ hospitalId }: Props) => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data: notifications = [] } = useQuery({
    queryKey: ['hospital-notifications', hospitalId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hospital_notifications' as any)
        .select('*')
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data as any[]) || [];
    },
    enabled: !!hospitalId,
    refetchInterval: 30000, // Poll every 30s
  });

  const markRead = async (id: string) => {
    await supabase.from('hospital_notifications' as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['hospital-notifications'] });
  };

  const markAllRead = async () => {
    await supabase.from('hospital_notifications' as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('hospital_id', hospitalId)
      .eq('is_read', false);
    queryClient.invalidateQueries({ queryKey: ['hospital-notifications'] });
  };

  const filtered = filter === 'all' ? notifications : 
    filter === 'unread' ? notifications.filter((n: any) => !n.is_read) :
    notifications.filter((n: any) => n.category === filter);

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {unreadCount > 0 ? <BellRing className="h-5 w-5 text-destructive animate-pulse" /> : <Bell className="h-5 w-5 text-muted-foreground" />}
            Notifications
            {unreadCount > 0 && <Badge variant="destructive" className="text-[10px]">{unreadCount}</Badge>}
          </CardTitle>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs">
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="flex gap-1 flex-wrap pt-2">
          {['all', 'unread', 'admission', 'discharge', 'pharmacy', 'lab', 'ot', 'billing', 'security'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}
              className="text-[10px] h-6 px-2 capitalize">{f}</Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            )}
            {filtered.map((n: any) => {
              const Icon = categoryIcons[n.category] || Info;
              return (
                <div key={n.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${!n.is_read ? 'bg-primary/5' : ''} ${severityStyles[n.severity] || severityStyles.info}`}
                  onClick={() => !n.is_read && markRead(n.id)}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${n.severity === 'critical' ? 'text-destructive' : n.severity === 'warning' ? 'text-amber-500' : 'text-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold text-foreground ${!n.is_read ? 'font-bold' : ''}`}>{n.title}</span>
                        <Badge variant="outline" className="text-[8px] capitalize">{n.category}</Badge>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
