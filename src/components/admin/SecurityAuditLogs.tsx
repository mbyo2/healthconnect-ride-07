import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Shield, AlertCircle, CheckCircle, Info, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
}

export function SecurityAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);

      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Get unique event types
      const types = Array.from(new Set(logsData?.map(log => log.event_type) || []));
      setEventTypes(types);

      // Fetch user emails for each log
      const logsWithEmails: AuditLog[] = await Promise.all(
        (logsData || []).map(async (log) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', log.user_id)
            .single();

          return {
            id: log.id,
            user_id: log.user_id,
            event_type: log.event_type,
            event_data: log.event_data,
            ip_address: log.ip_address as string | null,
            user_agent: log.user_agent,
            created_at: log.created_at,
            user_email: profileData?.email || 'Unknown',
          };
        })
      );

      setLogs(logsWithEmails);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; icon: any }> = {
      role_assigned: { variant: 'default', icon: CheckCircle },
      role_revoked: { variant: 'destructive', icon: AlertCircle },
      role_change: { variant: 'outline', icon: Info },
      login_success: { variant: 'secondary', icon: CheckCircle },
      login_failed: { variant: 'destructive', icon: AlertCircle },
      logout: { variant: 'outline', icon: Info },
    };

    const config = variants[eventType] || { variant: 'outline' as const, icon: Info };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {eventType.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const filteredLogs = eventFilter === 'all' 
    ? logs 
    : logs.filter(log => log.event_type === eventFilter);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: 'Timestamp',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">{date.toLocaleTimeString()}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'event_type',
      header: 'Event Type',
      cell: ({ row }) => getEventBadge(row.getValue('event_type')),
    },
    {
      accessorKey: 'user_email',
      header: 'User',
      cell: ({ row }) => {
        return <span className="font-mono text-sm">{row.getValue('user_email')}</span>;
      },
    },
    {
      accessorKey: 'event_data',
      header: 'Details',
      cell: ({ row }) => {
        const eventData = row.getValue('event_data') as any;
        
        if (eventData?.role) {
          return (
            <div className="text-sm">
              <span className="text-muted-foreground">Role: </span>
              <Badge variant="outline">{eventData.role}</Badge>
            </div>
          );
        }
        
        if (eventData?.old_role && eventData?.new_role) {
          return (
            <div className="text-sm flex items-center gap-2">
              <Badge variant="outline">{eventData.old_role}</Badge>
              <span>→</span>
              <Badge variant="outline">{eventData.new_role}</Badge>
            </div>
          );
        }

        return <span className="text-muted-foreground text-sm">-</span>;
      },
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
      cell: ({ row }) => {
        const ip = row.getValue('ip_address') as string;
        return ip ? (
          <span className="font-mono text-sm">{ip}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'user_agent',
      header: 'Device',
      cell: ({ row }) => {
        const userAgent = row.getValue('user_agent') as string;
        if (!userAgent) return <span className="text-muted-foreground">-</span>;
        
        // Extract browser info
        const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
        const browser = userAgent.includes('Chrome') ? 'Chrome' :
                       userAgent.includes('Firefox') ? 'Firefox' :
                       userAgent.includes('Safari') ? 'Safari' : 'Unknown';
        
        return (
          <div className="text-sm">
            <div>{browser}</div>
            <div className="text-muted-foreground">{isMobile ? 'Mobile' : 'Desktop'}</div>
          </div>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Audit Logs
            </CardTitle>
            <CardDescription>
              Monitor security-related events and role changes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {eventTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={filteredLogs} />
      </CardContent>
    </Card>
  );
}
