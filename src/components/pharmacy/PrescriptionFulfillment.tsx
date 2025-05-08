
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/components/ui/use-toast";
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type PrescriptionStatus = 'pending' | 'processing' | 'fulfilled' | 'declined';

interface Prescription {
  id?: string;
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  patient_id?: string;
  prescribed_by?: string;
  prescribed_date?: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  fulfillment_status?: PrescriptionStatus;
}

export const PrescriptionFulfillment = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isOnline, queueOfflineAction } = useOfflineMode();

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast({
        variant: "destructive",
        title: "Failed to load prescriptions",
        description: "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrescriptionStatus = async (id: string, fulfillment_status: PrescriptionStatus) => {
    try {
      if (!isOnline) {
        await queueOfflineAction({
          type: 'UPDATE_PRESCRIPTION_STATUS',
          payload: { id, fulfillment_status }
        });
        
        // Optimistic UI update
        setPrescriptions(prev => 
          prev.map(p => p.id === id ? { ...p, fulfillment_status } : p)
        );
        
        toast({
          title: "Status update queued",
          description: "Changes will be applied when you're back online",
        });
        return;
      }

      const { error } = await supabase
        .from('prescriptions')
        .update({ fulfillment_status })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setPrescriptions(prev => 
        prev.map(p => p.id === id ? { ...p, fulfillment_status } : p)
      );
      
      toast({
        title: "Prescription updated",
        description: `Status changed to ${fulfillment_status}`,
      });
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "Please try again later",
      });
    }
  };

  const getStatusBadge = (status: PrescriptionStatus | undefined) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Fulfilled</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Declined</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Prescription Fulfillment</h2>
      
      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No prescriptions found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        prescriptions.map((prescription) => (
          <Card key={prescription.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{prescription.medication_name}</CardTitle>
                {getStatusBadge(prescription.fulfillment_status as PrescriptionStatus)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dosage</p>
                  <p>{prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Frequency</p>
                  <p>{prescription.frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prescribed Date</p>
                  <p>{new Date(prescription.prescribed_date || '').toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{prescription.notes || 'None'}</p>
                </div>
              </div>
            </CardContent>
            {prescription.fulfillment_status !== 'fulfilled' && 
             prescription.fulfillment_status !== 'declined' && (
              <CardFooter className="flex justify-end gap-2">
                {prescription.fulfillment_status === 'pending' && (
                  <Button 
                    variant="outline" 
                    onClick={() => prescription.id && updatePrescriptionStatus(prescription.id, 'processing')}
                  >
                    Start Processing
                  </Button>
                )}
                {prescription.fulfillment_status === 'processing' && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => prescription.id && updatePrescriptionStatus(prescription.id, 'declined')}
                    >
                      <AlertCircle className="mr-2 h-4 w-4" /> Decline
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={() => prescription.id && updatePrescriptionStatus(prescription.id, 'fulfilled')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark Fulfilled
                    </Button>
                  </>
                )}
              </CardFooter>
            )}
          </Card>
        ))
      )}
    </div>
  );
};
