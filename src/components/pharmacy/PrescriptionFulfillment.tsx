
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
import { safeLocalGet, safeLocalSet, safeCryptoUUID } from '@/utils/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, Pill } from 'lucide-react';

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
  fulfillment_status?: 'pending' | 'fulfilled' | 'partially_fulfilled' | 'cancelled';
  patient_name?: string; // Join field
}

// Define the fulfillment data structure
interface FulfillmentData {
  prescription_id: string;
  status: 'pending' | 'fulfilled' | 'partially_fulfilled' | 'cancelled';
  updated_at?: string;
}

export function PrescriptionFulfillment() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillmentCache, setFulfillmentCache] = useState<Record<string, string>>({});
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

        // Load data from Supabase if online
        const { data: prescriptionsData, error } = await supabase
          .from('comprehensive_prescriptions')
          .select(`
            *,
            profiles:patient_id(first_name, last_name),
            provider:provider_id(first_name, last_name)
          `);

        if (error) throw error;

        // Load fulfillment data from localStorage since we don't have that table in Supabase yet
        const storedFulfillments = safeLocalGet('prescription_fulfillments');
        let fulfillmentData: any[] = [];
        try {
          fulfillmentData = storedFulfillments ? JSON.parse(storedFulfillments) : [];
        } catch (e) {
          fulfillmentData = [];
        }

        // Transform the data
        const prescriptionsWithStatus = prescriptionsData.map((prescription: any) => {
          // Find fulfillment status if it exists
          let fulfillmentStatus = 'pending';

          if (fulfillmentData && fulfillmentData.length > 0) {
            const fulfillment = fulfillmentData.find((f: FulfillmentData) => f.prescription_id === prescription.id);
            if (fulfillment) {
              fulfillmentStatus = fulfillment.status;
            }
          } else {
            // Fallback to cached data
            fulfillmentStatus = fulfillmentCache[prescription.id] || 'pending';
          }

          return {
            id: prescription.id,
            patient_id: prescription.patient_id,
            medication_name: prescription.medication_name,
            dosage: prescription.dosage,
            frequency: prescription.instructions, // Map instructions to frequency for display
            prescribed_by: prescription.provider ? `Dr. ${prescription.provider.first_name} ${prescription.provider.last_name}` : 'Unknown Provider',
            prescribed_date: prescription.prescribed_date,
            notes: prescription.notes,
            fulfillment_status: fulfillmentStatus as 'pending' | 'fulfilled' | 'partially_fulfilled' | 'cancelled',
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
  }, [isOnline, toast, cacheForOffline, getOfflineCache, fulfillmentCache]);

  const updateFulfillmentStatus = async (prescriptionId: string, newStatus: string) => {
    try {
      // First update local state for immediate UI feedback
      setPrescriptions(prev => prev.map(p => {
        if (p.id === prescriptionId) {
          return {
            ...p,
            fulfillment_status: newStatus as 'pending' | 'fulfilled' | 'partially_fulfilled' | 'cancelled'
          };
        }
        return p;
      }));

      // Update cache
      setFulfillmentCache(prev => ({
        ...prev,
        [prescriptionId]: newStatus
      }));

      // If offline, queue the update for later
      if (!isOnline) {
        await queueOfflineAction({
          id: safeCryptoUUID(),
          type: 'UPDATE_PRESCRIPTION_STATUS',
          table: 'prescription_fulfillments',
          data: {
            prescription_id: prescriptionId,
            status: newStatus
          }
        });

        toast({
          title: "Status saved offline",
          description: "Change will be synced when connection is restored",
        });
        return;
      }

      // Since we don't have the prescription_fulfillments table in Supabase yet,
      // we'll store the data in localStorage as a temporary solution
      let currentFulfillments: any[] = [];
      try {
        const storedFulfillments = safeLocalGet('prescription_fulfillments');
        currentFulfillments = storedFulfillments ? JSON.parse(storedFulfillments) : [];
      } catch (err) {
        console.warn('Unable to read prescription_fulfillments from safe storage:', err);
        currentFulfillments = [];
      }

      // Find if this prescription already has a status entry
      const existingFulfillmentIndex = currentFulfillments.findIndex(
        (f: FulfillmentData) => f.prescription_id === prescriptionId
      );

      if (existingFulfillmentIndex >= 0) {
        // Update existing entry
        currentFulfillments[existingFulfillmentIndex] = {
          prescription_id: prescriptionId,
          status: newStatus,
          updated_at: new Date().toISOString()
        };
      } else {
        // Add new entry
        currentFulfillments.push({
          prescription_id: prescriptionId,
          status: newStatus,
          updated_at: new Date().toISOString()
        });
      }

      // Save back to localStorage
      try {
        safeLocalSet('prescription_fulfillments', JSON.stringify(currentFulfillments));
      } catch (err) {
        console.warn('Unable to persist prescription_fulfillments to localStorage:', err);
      }

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

  if (loading) {
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
                    prescription.fulfillment_status === 'fulfilled' ? 'default' :
                      prescription.fulfillment_status === 'partially_fulfilled' ? 'secondary' :
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
                disabled={!isOnline && !safeLocalGet('offlineModePrescriptionUpdatesEnabled')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_fulfilled">Partially Fulfilled</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
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
