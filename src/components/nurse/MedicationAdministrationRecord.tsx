import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Pill, Clock, CheckCircle2, XCircle, AlertTriangle, User, Loader2 } from 'lucide-react';

interface MAREntry {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  scheduled_time: string;
  administered_time: string | null;
  status: string;
  hold_reason: string | null;
  refusal_reason: string | null;
  administered_by: string | null;
  notes: string | null;
  patient?: { first_name: string; last_name: string };
}

interface MARProps {
  institutionId: string;
  patientId?: string;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  scheduled: { color: 'bg-blue-500', icon: Clock },
  administered: { color: 'bg-green-500', icon: CheckCircle2 },
  missed: { color: 'bg-red-500', icon: XCircle },
  held: { color: 'bg-yellow-500', icon: AlertTriangle },
  refused: { color: 'bg-orange-500', icon: XCircle },
  not_given: { color: 'bg-gray-500', icon: XCircle },
};

export const MedicationAdministrationRecord: React.FC<MARProps> = ({ institutionId, patientId }) => {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<MAREntry | null>(null);
  const [administerDialogOpen, setAdministerDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('administered');

  const { data: marEntries, isLoading } = useQuery({
    queryKey: ['mar-entries', institutionId, patientId],
    queryFn: async () => {
      let query = supabase
        .from('medication_administration_records')
        .select(`
          *,
          patient:profiles!medication_administration_records_patient_id_fkey(first_name, last_name)
        `)
        .eq('institution_id', institutionId)
        .order('scheduled_time', { ascending: true });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MAREntry[];
    },
  });

  const administerMutation = useMutation({
    mutationFn: async ({ id, status, notes, holdReason }: { id: string; status: string; notes: string; holdReason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, unknown> = {
        status,
        notes,
        administered_by: user?.id,
        administered_time: status === 'administered' ? new Date().toISOString() : null,
      };

      if (holdReason) {
        updateData.hold_reason = holdReason;
      }

      const { error } = await supabase
        .from('medication_administration_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mar-entries'] });
      toast.success('Medication record updated successfully');
      setAdministerDialogOpen(false);
      setSelectedEntry(null);
      setAdminNotes('');
      setHoldReason('');
    },
    onError: (error) => {
      toast.error('Failed to update medication record');
      console.error(error);
    },
  });

  const handleAdminister = () => {
    if (!selectedEntry) return;
    administerMutation.mutate({
      id: selectedEntry.id,
      status: selectedStatus,
      notes: adminNotes,
      holdReason: selectedStatus === 'held' ? holdReason : undefined,
    });
  };

  const getDueStatus = (scheduledTime: string, status: string) => {
    if (status !== 'scheduled') return null;
    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes < -30) return 'overdue';
    if (diffMinutes < 0) return 'due-now';
    if (diffMinutes < 30) return 'due-soon';
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Medication Administration Record (MAR)
        </CardTitle>
        <CardDescription>
          Track and document medication administration for patients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marEntries?.map((entry) => {
              const StatusIcon = statusConfig[entry.status]?.icon || Clock;
              const dueStatus = getDueStatus(entry.scheduled_time, entry.status);

              return (
                <TableRow key={entry.id} className={dueStatus === 'overdue' ? 'bg-red-50 dark:bg-red-950' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {entry.patient?.first_name} {entry.patient?.last_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{entry.medication_name}</TableCell>
                  <TableCell>{entry.dosage}</TableCell>
                  <TableCell className="capitalize">{entry.route}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(entry.scheduled_time), 'MMM d, yyyy')}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.scheduled_time), 'HH:mm')}
                      </span>
                      {dueStatus && (
                        <Badge variant={dueStatus === 'overdue' ? 'destructive' : 'secondary'} className="mt-1 w-fit">
                          {dueStatus === 'overdue' ? 'Overdue' : dueStatus === 'due-now' ? 'Due Now' : 'Due Soon'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusConfig[entry.status]?.color} text-white`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.status === 'scheduled' && (
                      <Dialog open={administerDialogOpen && selectedEntry?.id === entry.id} onOpenChange={(open) => {
                        setAdministerDialogOpen(open);
                        if (open) setSelectedEntry(entry);
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setSelectedEntry(entry)}>
                            Document
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Document Medication Administration</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="bg-muted p-4 rounded-lg">
                              <p className="font-medium">{entry.medication_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {entry.dosage} • {entry.route} • {entry.frequency}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="administered">Administered</SelectItem>
                                  <SelectItem value="held">Held</SelectItem>
                                  <SelectItem value="refused">Refused</SelectItem>
                                  <SelectItem value="not_given">Not Given</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedStatus === 'held' && (
                              <div className="space-y-2">
                                <Label>Hold Reason</Label>
                                <Input
                                  value={holdReason}
                                  onChange={(e) => setHoldReason(e.target.value)}
                                  placeholder="e.g., Patient NPO for procedure"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Document patient response, vitals, or other observations..."
                              />
                            </div>

                            <Button
                              onClick={handleAdminister}
                              disabled={administerMutation.isPending}
                              className="w-full"
                            >
                              {administerMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Confirm
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {entry.status !== 'scheduled' && entry.administered_time && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.administered_time), 'HH:mm')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {(!marEntries || marEntries.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No medication administration records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MedicationAdministrationRecord;
