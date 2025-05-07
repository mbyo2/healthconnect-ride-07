
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOfflineMode } from '@/hooks/use-offline-mode';

interface Prescription {
  id: string;
  medication_name: string;
  patient_id: string;
  dosage: string;
  prescribed_date: string;
  status?: 'pending' | 'processing' | 'ready' | 'fulfilled' | 'cancelled';
  patient?: {
    first_name: string;
    last_name: string;
  };
}

export const PrescriptionFulfillment = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { isOnline, queueOfflineAction } = useOfflineMode();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // For pharmacy staff, show all prescriptions
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patient:patient_id (
            first_name,
            last_name
          )
        `)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      return data as Prescription[];
    },
  });

  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!isOnline) {
        await queueOfflineAction({
          type: 'UPDATE_PRESCRIPTION_STATUS',
          payload: { id, status }
        });
        return { id, status };
      }

      const { error } = await supabase
        .from('prescriptions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription status updated');
    },
    onError: () => {
      toast.error('Failed to update prescription status');
    }
  });

  const filteredPrescriptions = statusFilter === 'all' 
    ? prescriptions 
    : prescriptions.filter(p => p.status === statusFilter);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'ready':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Ready</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Fulfilled</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getProgressValue = (status?: string) => {
    switch (status) {
      case 'pending':
        return 25;
      case 'processing':
        return 50;
      case 'ready':
        return 75;
      case 'fulfilled':
        return 100;
      default:
        return 0;
    }
  };

  const handleStatusChange = (prescriptionId: string, newStatus: string) => {
    updatePrescriptionMutation.mutate({ 
      id: prescriptionId, 
      status: newStatus as 'pending' | 'processing' | 'ready' | 'fulfilled' | 'cancelled' 
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Loading prescriptions...</h2>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Prescription Fulfillment</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="fulfilled">Fulfilled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPrescriptions.length === 0 ? (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrescriptions.map((prescription) => (
            <Card key={prescription.id} className="mb-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {prescription.medication_name} ({prescription.dosage})
                  </CardTitle>
                  {getStatusBadge(prescription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  For: {prescription.patient?.first_name} {prescription.patient?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Prescribed: {new Date(prescription.prescribed_date).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label className="text-xs text-muted-foreground mb-2">Status</Label>
                  <Progress value={getProgressValue(prescription.status)} className="h-2" />
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <Label>Update Status</Label>
                  <Select 
                    disabled={!isOnline || prescription.status === 'fulfilled' || prescription.status === 'cancelled'}
                    value={prescription.status || 'pending'}
                    onValueChange={(value) => handleStatusChange(prescription.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="ready">Ready for Pickup</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {!isOnline && (
                  <p className="text-xs text-amber-600 mt-2">
                    You're offline. Status changes will be queued for when you're back online.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrescriptionFulfillment;
