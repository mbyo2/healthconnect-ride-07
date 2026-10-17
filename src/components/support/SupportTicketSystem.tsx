import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, MessageSquare, Loader2, Send, UserCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  resolved: 'bg-green-500',
  closed: 'bg-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-sky-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export const SupportTicketSystem = ({ showAll = false }: { showAll?: boolean }) => {
  const { user } = useAuth();
  const { availableRoles } = useUserRoles();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState('');

  const isStaff = useMemo(
    () => availableRoles.some((r) => ['support', 'admin', 'super_admin'].includes(r)),
    [availableRoles]
  );

  // ── Tickets ──────────────────────────────────────────────────
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', user?.id, showAll],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = (supabase.from('support_tickets' as any) as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (!showAll || !isStaff) q = q.eq('created_by', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Ticket[]) || [];
    },
  });

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tickets, statusFilter, priorityFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets?.length || 0 };
    for (const t of tickets || []) counts[t.status] = (counts[t.status] || 0) + 1;
    return counts;
  }, [tickets]);

  // ── Messages for selected ticket ─────────────────────────────
  const { data: messages } = useQuery({
    queryKey: ['ticket-messages', selectedTicket?.id],
    enabled: !!selectedTicket?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('support_ticket_messages' as any) as any)
        .select('*')
        .eq('ticket_id', selectedTicket!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as TicketMessage[]) || [];
    },
  });

  // ── Mutations ────────────────────────────────────────────────
  const createTicket = useMutation({
    mutationFn: async (form: { subject: string; description: string; category: string; priority: string }) => {
      const { error } = await (supabase.from('support_tickets' as any) as any).insert({
        ...form,
        created_by: user!.id,
        status: 'open',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setShowCreate(false);
      toast.success('Ticket created. Our support team will respond soon.');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create ticket'),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Ticket> }) => {
      const { error } = await (supabase.from('support_tickets' as any) as any)
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      if (selectedTicket && selectedTicket.id === vars.id) {
        setSelectedTicket({ ...selectedTicket, ...vars.patch });
      }
      toast.success('Ticket updated.');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to update ticket'),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedTicket || !replyText.trim()) return;
      const { error } = await (supabase.from('support_ticket_messages' as any) as any).insert({
        ticket_id: selectedTicket.id,
        sender_id: user!.id,
        message: replyText.trim(),
      });
      if (error) throw error;
      // First staff reply moves the ticket to in_progress automatically.
      if (isStaff && selectedTicket.status === 'open') {
        await (supabase.from('support_tickets' as any) as any)
          .update({ status: 'in_progress', assigned_to: selectedTicket.assigned_to || user!.id })
          .eq('id', selectedTicket.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', selectedTicket?.id] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReplyText('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to send reply'),
  });

  const [createForm, setCreateForm] = useState({ subject: '', description: '', category: 'technical', priority: 'medium' });

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              <span className="ml-1.5 opacity-70">{statusCounts[s] || 0}</span>
            </button>
          ))}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-muted/50"
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Open a Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={createForm.subject} onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })} placeholder="Brief summary of the issue" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Describe the problem in detail…" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createTicket.mutate(createForm)}
                disabled={!createForm.subject.trim() || !createForm.description.trim() || createTicket.isPending}
              >
                {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Ticket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}</div>
      ) : filteredTickets.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No tickets found. Open a new ticket to get help.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedTicket(t)}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category} · {format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <Badge className={`${PRIORITY_COLORS[t.priority]} text-white text-[10px]`}>{t.priority}</Badge>
                <Badge className={`${STATUS_COLORS[t.status]} text-white text-[10px]`}>{t.status.replace('_', ' ')}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket detail dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedTicket?.subject}</DialogTitle>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedTicket && <Badge className={`${STATUS_COLORS[selectedTicket.status]} text-white text-[10px]`}>{selectedTicket.status.replace('_', ' ')}</Badge>}
              {selectedTicket && <Badge className={`${PRIORITY_COLORS[selectedTicket.priority]} text-white text-[10px]`}>{selectedTicket.priority}</Badge>}
              {selectedTicket && <Badge variant="outline" className="text-[10px]">{selectedTicket.category}</Badge>}
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">{selectedTicket?.description}</p>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto space-y-2 py-1 min-h-[120px]">
            {(messages || []).map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary-500 text-white' : 'bg-muted'}`}>
                    <p>{m.message}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {format(new Date(m.created_at), 'MMM d HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply box */}
          {selectedTicket?.status !== 'closed' && (
            <div className="flex gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a reply…"
                onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) sendReply.mutate(); }}
              />
              <Button size="icon" onClick={() => sendReply.mutate()} disabled={!replyText.trim() || sendReply.isPending}>
                {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Staff actions */}
          {isStaff && selectedTicket && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              {selectedTicket.status === 'open' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateTicket.mutate({ id: selectedTicket.id, patch: { status: 'in_progress', assigned_to: user!.id } })}>
                  <UserCheck className="h-3.5 w-3.5" /> Take Ticket
                </Button>
              )}
              {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateTicket.mutate({ id: selectedTicket.id, patch: { status: 'resolved', resolved_at: new Date().toISOString() } })}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
                </Button>
              )}
              {selectedTicket.status !== 'closed' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateTicket.mutate({ id: selectedTicket.id, patch: { status: 'closed' } })}>
                  <XCircle className="h-3.5 w-3.5" /> Close
                </Button>
              )}
              {selectedTicket.status === 'closed' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => updateTicket.mutate({ id: selectedTicket.id, patch: { status: 'open', resolved_at: null } })}>
                  <Clock className="h-3.5 w-3.5" /> Reopen
                </Button>
              )}
            </div>
          )}

          {/* Creator close action */}
          {!isStaff && selectedTicket && ['open', 'in_progress'].includes(selectedTicket.status) && (
            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => updateTicket.mutate({ id: selectedTicket.id, patch: { status: 'closed' } })}>
                Close Ticket
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
