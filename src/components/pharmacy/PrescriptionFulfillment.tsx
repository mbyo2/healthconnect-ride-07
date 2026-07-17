
import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { safeCryptoUUID } from '@/utils/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, Pill } from 'lucide-react';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';

// Type definition for prescriptions
interface Prescription {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage: string;
  frequency?: string;
  prescribed_by: string;
  prescribed_date: string;
  end_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Add custom fields that we'll manage separately
  fulfillment_status?: 'pending' | 'filled' | 'partially_filled' | 'cancelled';
  patient_name?: string; // Join field
}

export function PrescriptionFulfillment() {
  const { institutionId, loading: institutionLoading } = useInstitutionContext();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isOnline, queueOfflineAction, cacheForOffline, getOfflineCache } = useOfflineMode();

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        setLoading(true);

        // First try to get cached data if offline
        if (!isOnline) {
          const cachedData = await getOfflineCache('pharmacy_prescriptions');
          if (cachedData) {
            setPrescriptions(cachedData);
            setLoading(false);
            toast({
              title: "Using cached prescription data",
              description: "You're viewing offline data which may not be current",
              variant: "destructive",
            });
            return;
          }
        }

        if (!institutionId) {
          setPrescriptions([]);
          return;
        }

        // The prescription's status is the authoritative dispensing state.
        const { data: prescriptionsData, error } = await supabase
          .from('comprehensive_prescriptions')
          .select(`
            *,
            profiles:patient_id(first_name, last_name),
            provider:provider_id(first_name, last_name)
          `)
          .eq('pharmacy_id', institutionId);

        if (error) throw error;

        // Transform the data
        const prescriptionsWithStatus = prescriptionsData.map((prescription: any) => {
          return {
            id: prescription.id,
            patient_id: prescription.patient_id,
            medication_name: prescription.medication_name,
            dosage: prescription.dosage,
            frequency: prescription.instructions, // Map instructions to frequency for display
            prescribed_by: prescription.provider ? `Dr. ${prescription.provider.first_name} ${prescription.provider.last_name}` : 'Unknown Provider',
            prescribed_date: prescription.prescribed_date,
            notes: prescription.notes,
            fulfillment_status: prescription.status as 'pending' | 'filled' | 'partially_filled' | 'cancelled',
            patient_name: prescription.profiles ?
              `${prescription.profiles.first_name} ${prescription.profiles.last_name}` :
              'Unknown Patient'
          };
        });

        setPrescriptions(prescriptionsWithStatus);

        // Cache data for offline use
        await cacheForOffline('pharmacy_prescriptions', prescriptionsWithStatus);

      } catch (error) {
        console.error('Error loading prescriptions:', error);
        toast({
          title: "Error loading prescriptions",
          description: "Could not retrieve prescription data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, [institutionId, institutionLoading, isOnline, toast, cacheForOffline, getOfflineCache]);

  const updateFulfillmentStatus = async (prescriptionId: string, newStatus: string) => {
    try {
      setPrescriptions(prev => prev.map(p => {
        if (p.id === prescriptionId) {
          return {
            ...p,
            fulfillment_status: newStatus as 'pending' | 'filled' | 'partially_filled' | 'cancelled'
          };
        }
        return p;
      }));

      if (!isOnline) {
        await queueOfflineAction({
          id: safeCryptoUUID(),
          type: 'UPDATE_PRESCRIPTION_STATUS',
          table: 'comprehensive_prescriptions',
          data: {
            id: prescriptionId,
            status: newStatus
          }
        });

        toast({
          title: "Status saved offline",
          description: "Change will be synced when connection is restored",
        });
        return;
      }

      if (!institutionId) throw new Error('No pharmacy institution is associated with this account.');
      const { error } = await supabase
        .from('comprehensive_prescriptions')
        .update({ status: newStatus })
        .eq('id', prescriptionId)
        .eq('pharmacy_id', institutionId);
      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Prescription status has been updated",
      });
    } catch (error) {
      console.error('Error updating fulfillment status:', error);
      toast({
        title: "Error updating status",
        description: "Could not update fulfillment status",
        variant: "destructive",
      });
    }
  };

  if (loading || institutionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        {[1, 2, 3].map(i => (
          <Card key={i} className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-[300px]" />
              <Skeleton className="h-4 w-[250px]" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-[100px]" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Prescriptions to Fulfill</CardTitle>
          <CardDescription>
            There are no pending prescriptions in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-center">
            <Pill className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No prescriptions available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Prescriptions to Fulfill</h2>
        {!isOnline && (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 flex gap-2 items-center">
            <AlertTriangle className="h-4 w-4" />
            Offline Mode
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {prescriptions.map((prescription) => (
          <Card key={prescription.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{prescription.medication_name}</CardTitle>
                  <CardDescription>Patient: {prescription.patient_name || 'Unknown'}</CardDescription>
                </div>
                <Badge
                  variant={
                    prescription.fulfillment_status === 'filled' ? 'default' :
                      prescription.fulfillment_status === 'partially_filled' ? 'secondary' :
                        prescription.fulfillment_status === 'cancelled' ? 'destructive' :
                          'outline'
                  }
                >
                  {prescription.fulfillment_status?.replace('_', ' ') || 'pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-medium">Dosage:</p>
                  <p>{prescription.dosage}</p>
                </div>
                <div>
                  <p className="font-medium">Frequency:</p>
                  <p>{prescription.frequency}</p>
                </div>
                <div>
                  <p className="font-medium">Prescriber:</p>
                  <p>{prescription.prescribed_by}</p>
                </div>
                <div>
                  <p className="font-medium">Date Prescribed:</p>
                  <p>{new Date(prescription.prescribed_date).toLocaleDateString()}</p>
                </div>
              </div>

              {prescription.notes && (
                <div className="mt-2">
                  <p className="font-medium">Notes:</p>
                  <p className="text-sm text-muted-foreground">{prescription.notes}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Select
                value={prescription.fulfillment_status || 'pending'}
                onValueChange={(value) => updateFulfillmentStatus(prescription.id, value)}
                disabled={!isOnline}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_filled">Partially Filled</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => console.log('View details', prescription.id)}>
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
