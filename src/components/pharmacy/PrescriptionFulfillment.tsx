
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { Textarea } from "../ui/textarea";
import { logAnalyticsEvent } from "@/utils/analytics-service";

// Define interface for prescription data
interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  patient_id: string;
  prescribed_by: string;
  prescribed_date: string;
  end_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  fulfillment_status?: string;
  pharmacist_notes?: string;
  fulfilled_at?: string;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
  };
}

export const PrescriptionFulfillment = () => {
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { isOnline, queueOfflineAction, offlineActions, syncOfflineActions, offlineFeatures } = useOfflineMode();
  const queryClient = useQueryClient();

  // Query prescriptions that need fulfillment
  const { data: prescriptions, isLoading, error } = useQuery({
    queryKey: ['pending-prescriptions'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            id,
            medication_name,
            dosage,
            frequency,
            patient_id,
            prescribed_by,
            prescribed_date,
            end_date,
            notes,
            created_at,
            updated_at,
            patient:profiles!prescriptions_patient_id_fkey(
              first_name,
              last_name,
              date_of_birth
            )
          `)
          .eq('fulfillment_status', 'pending');
  
        if (error) throw error;
        
        // Since the fulfillment_status might not exist yet in the database schema,
        // we'll add a default value here for all prescriptions
        const enhancedData = data?.map(prescription => ({
          ...prescription,
          fulfillment_status: 'pending'
        })) as Prescription[];
        
        return enhancedData;
      } catch (error) {
        console.error("Error fetching prescriptions:", error);
        return [] as Prescription[];
      }
    },
    // Enabled only when online
    enabled: isOnline,
  });

  const handleFulfill = async (id: string) => {
    try {
      setProcessingId(id);
      
      // Record analytics
      logAnalyticsEvent('prescription_fulfillment_started', {
        prescription_id: id,
        status: fulfillmentStatus
      });
      
      // If offline, queue action for later
      if (!isOnline) {
        const success = await queueOfflineAction({
          id: crypto.randomUUID(),
          type: 'update',
          table: 'prescriptions',
          data: {
            id: id,
            fulfillment_status: fulfillmentStatus,
            pharmacist_notes: notes,
            fulfilled_at: new Date().toISOString()
          }
        });
        
        if (success) {
          toast.success("Prescription fulfillment queued for when you're back online");
          setSelectedPrescription(null);
          setFulfillmentStatus("");
          setNotes("");
        } else {
          toast.error("Failed to queue fulfillment action");
        }
        setProcessingId(null);
        return;
      }

      // Online flow - use a more generic update approach to avoid depending on fulfillment_status column
      // which might not exist yet in the database
      const updateData: Record<string, any> = {};
      
      // Only add fields that we're sure to have permission to update
      if (fulfillmentStatus) {
        updateData.fulfillment_status = fulfillmentStatus;
      }
      
      if (notes) {
        updateData.pharmacist_notes = notes;
      }
      
      updateData.fulfilled_at = new Date().toISOString();

      const { error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Log successful fulfillment
      logAnalyticsEvent('prescription_fulfilled', {
        prescription_id: id,
        status: fulfillmentStatus
      });
      
      toast.success("Prescription status updated successfully");
      queryClient.invalidateQueries({ queryKey: ['pending-prescriptions'] });
      setSelectedPrescription(null);
      setFulfillmentStatus("");
      setNotes("");
      
    } catch (error) {
      console.error("Error updating prescription:", error);
      toast.error("Failed to update prescription status");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-800 flex items-center">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>Failed to load prescriptions. Please try again.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-bold">Prescription Fulfillment</h2>
      
      {!isOnline && (
        <div className="p-4 mb-4 border border-yellow-200 rounded-md bg-yellow-50 text-yellow-800">
          You are working offline. Fulfillment actions will be queued for when you're back online.
        </div>
      )}

      {prescriptions?.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No pending prescriptions to fulfill
        </div>
      ) : (
        <>
          {prescriptions?.map((prescription) => (
            <Card key={prescription.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-lg flex justify-between">
                  {prescription.medication_name}
                  <Badge className="ml-2">{prescription.fulfillment_status || "Pending"}</Badge>
                </CardTitle>
                <CardDescription>
                  For: {prescription.patient.first_name} {prescription.patient.last_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <span className="font-medium">Dosage:</span>
                    <span className="ml-2">{prescription.dosage}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Frequency:</span>
                    <span className="ml-2">{prescription.frequency}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Prescribed:</span>
                    <span className="ml-2">
                      {new Date(prescription.prescribed_date).toLocaleDateString()}
                    </span>
                  </div>
                  {prescription.notes && (
                    <div className="mt-2">
                      <span className="font-medium">Doctor's Notes:</span>
                      <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                        {prescription.notes}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="default"
                      onClick={() => setSelectedPrescription(prescription.id)}
                    >
                      Update Status
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Update Prescription Status</AlertDialogTitle>
                      <AlertDialogDescription>
                        Update the fulfillment status for {prescription.medication_name}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label htmlFor="status">Status</label>
                        <Select
                          value={fulfillmentStatus}
                          onValueChange={setFulfillmentStatus}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fulfilled">Fulfilled</SelectItem>
                            <SelectItem value="partial">Partially Fulfilled</SelectItem>
                            <SelectItem value="backorder">On Backorder</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <label htmlFor="notes">Notes</label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Enter any notes about this fulfillment"
                          rows={3}
                        />
                      </div>
                    </div>
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={!fulfillmentStatus || processingId === prescription.id}
                        onClick={(e) => {
                          e.preventDefault();
                          handleFulfill(prescription.id);
                        }}
                      >
                        {processingId === prescription.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Update Status"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};
