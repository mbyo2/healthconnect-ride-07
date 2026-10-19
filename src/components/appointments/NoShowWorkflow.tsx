import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, Calendar, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * No-show workflow (Epic parity)
 * Allows staff to mark appointments as no-show and manage follow-up.
 */

interface NoShowAppointment {
  id: string;
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  patient_name: string;
  provider_name: string;
  no_show_at: string;
  no_show_reason?: string;
  follow_up_status: string;
}

export function NoShowManager({ institutionId }: { institutionId?: string }) {
  const queryClient = useQueryClient();
  const [showMarkDialog, setShowMarkDialog] = useState<string | null>(null);

  // Get no-show appointments
  const { data: noShows, isLoading } = useQuery({
    queryKey: ['no-shows', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('id, patient_id, provider_id, appointment_date, status')
        .eq('status', 'no_show')
        .order('appointment_date', { ascending: false })
        .limit(50);
      
      const { data, error } = await query;
      if (error) throw error;
      
      const rows = (data as any[]) || [];
      if (rows.length === 0) return [];
      
      // Get patient and provider names
      const patientIds = [...new Set(rows.map(r => r.patient_id))];
      const providerIds = [...new Set(rows.map(r => r.provider_id))];
      
      const [{ data: patients }, { data: providers }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name').in('id', patientIds),
        supabase.from('profiles').select('id, first_name, last_name').in('id', providerIds),
      ]);
      
      const patientMap = Object.fromEntries((patients || []).map((p: any) => [p.id, p]));
      const providerMap = Object.fromEntries((providers || []).map((p: any) => [p.id, p]));
      
      return rows.map(r => ({
        ...r,
        patient_name: patientMap[r.patient_id] 
          ? `${patientMap[r.patient_id].first_name} ${patientMap[r.patient_id].last_name}`
          : 'Unknown',
        provider_name: providerMap[r.provider_id]
          ? `Dr. ${providerMap[r.provider_id].first_name} ${providerMap[r.provider_id].last_name}`
          : 'Unknown',
      }));
    },
  });

  // Mark as no-show mutation
  const markNoShow = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'no_show',
          // Store reason in notes if column exists, otherwise just update status
        })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['no-shows'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Marked as no-show");
      setShowMarkDialog(null);
    },
    onError: () => {
      toast.error("Failed to mark as no-show. The status may not be allowed.");
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading no-shows...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserX className="h-4 w-4" />
          No-Show Management
          {(noShows?.length || 0) > 0 && (
            <Badge variant="destructive" className="ml-2">
              {noShows.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!noShows || noShows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No no-show appointments. Good attendance!
          </p>
        ) : (
          <div className="space-y-3">
            {noShows.map((appt: any) => (
              <div 
                key={appt.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="font-medium text-sm">{appt.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {appt.provider_name} • {format(new Date(appt.appointment_date), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Navigate to reschedule - would need appointment context
                      toast.info("Reschedule feature - select new time");
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      toast.info("Contact patient to follow up");
                    }}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Button to mark an appointment as no-show (for receptionist/staff use)
 */
export function MarkNoShowButton({ appointmentId }: { appointmentId: string }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['no-shows'] });
      toast.success("Marked as no-show");
    },
    onError: () => {
      toast.error("Failed to mark as no-show");
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (confirm("Mark this appointment as no-show?")) {
          mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      className="text-destructive hover:text-destructive"
    >
      <UserX className="h-3 w-3 mr-1" />
      No-show
    </Button>
  );
}
