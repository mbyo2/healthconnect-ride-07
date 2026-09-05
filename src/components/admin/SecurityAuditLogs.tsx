import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Shield, AlertCircle, CheckCircle, Info, Filter, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);

      const { data: logsData, error: logsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Increased for better filtering

      if (logsError) throw logsError;

      const types = Array.from(new Set(logsData?.map(log => log.event_type) || []));
      setEventTypes(types);

      // Batch-fetch all referenced user emails
      const userIds = Array.from(new Set((logsData || []).map(l => l.user_id).filter(Boolean)));
      const emailByUser = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);
        (profs || []).forEach((p: any) => emailByUser.set(p.id, p.email || 'Unknown'));
      }

      const logsWithEmails: AuditLog[] = (logsData || []).map((log) => ({
        id: log.id,
        user_id: log.user_id,
        event_type: log.event_type,
        event_data: log.event_data,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent,
        created_at: log.created_at,
        user_email: emailByUser.get(log.user_id) || 'Unknown',
      }));

      setLogs(logsWithEmails);
      toast.success('Audit logs refreshed');
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

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Filter by event type
    if (eventFilter !== 'all') {
      filtered = filtered.filter(log => log.event_type === eventFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.event_type.toLowerCase().includes(query) ||
        (log.user_email && log.user_email.toLowerCase().includes(query)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [logs, eventFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [eventFilter, searchQuery]);

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
              Showing {paginatedLogs.length} of {filteredLogs.length} audit logs
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger>
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

          <Select value={String(itemsPerPage)} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={paginatedLogs} />
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
