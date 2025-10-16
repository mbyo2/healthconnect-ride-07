import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const WaitlistManager = () => {
  const { data: waitlist, isLoading, refetch } = useQuery({
    queryKey: ['waitlist'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('patient_queue')
        .select(`
          *,
          patient:profiles!patient_queue_patient_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('provider_id', user.id)
        .order('priority', { ascending: false })
        .order('check_in_time', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  const updatePriority = async (id: string, priority: number) => {
    try {
      const { error } = await supabase
        .from('patient_queue')
        .update({ priority })
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Priority updated successfully");
      refetch();
    } catch (error) {
      console.error("Error updating priority:", error);
      toast.error("Failed to update priority");
    }
  };

  const removeFromWaitlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patient_queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Patient removed from waitlist");
      refetch();
    } catch (error) {
      console.error("Error removing from waitlist:", error);
      toast.error("Failed to remove from waitlist");
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading waitlist...</div>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Patient Waitlist</h2>
      
      {waitlist && waitlist.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waitlist.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.patient?.first_name ?? 'Unknown'} {item.patient?.last_name ?? ''}
                </TableCell>
                <TableCell>
                  {item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString() : '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePriority(item.id, item.priority + 1)}
                  >
                    ↑
                  </Button>
                  <span className="mx-2">{item.priority}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePriority(item.id, Math.max(0, item.priority - 1))}
                  >
                    ↓
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeFromWaitlist(item.id)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No patients in waitlist
        </div>
      )}
    </Card>
  );
};