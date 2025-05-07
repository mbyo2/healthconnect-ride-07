
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { cacheData } from '@/utils/cache-manager';

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  prescribed_date: string;
  status?: 'pending' | 'processing' | 'ready' | 'fulfilled' | 'cancelled';
  pharmacy_notes?: string;
  estimated_ready_date?: string;
  pharmacy_id?: string;
}

export const PrescriptionStatus = () => {
  const { isOnline, cacheForOffline, getOfflineCache } = useOfflineMode();

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions-status'],
    queryFn: async () => {
      if (!isOnline) {
        const cached = await getOfflineCache('prescriptions-status');
        if (cached) return cached;
        return [];
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      
      // Cache for offline use
      if (data) {
        await cacheForOffline('prescriptions-status', data);
      }
      
      return data as Prescription[];
    },
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'ready':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Ready for Pickup</Badge>;
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
      case 'cancelled':
        return 0;
      default:
        return 25;
    }
  };

  const handleRequestRefill = () => {
    toast.info("Refill request feature is coming soon!");
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading prescription status...</div>;
  }

  if (!isOnline && prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You're currently offline and don't have any cached prescription data.
            Please go online to view your prescription status.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You don't have any active prescriptions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
          <p className="text-sm text-amber-800">
            You're viewing cached data while offline. Some information may not be up-to-date.
          </p>
        </div>
      )}
      
      {prescriptions.map((prescription) => (
        <Card key={prescription.id} className="mb-4">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{prescription.medication_name}</h3>
              {getStatusBadge(prescription.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Dosage: {prescription.dosage}
            </p>
            <p className="text-sm text-muted-foreground">
              Prescribed: {new Date(prescription.prescribed_date).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{prescription.status || 'Pending'}</span>
              </div>
              <Progress value={getProgressValue(prescription.status)} className="h-2" />
            </div>
            
            {prescription.status === 'ready' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                <p className="text-sm text-green-800">
                  Your medication is ready for pickup!
                </p>
              </div>
            )}
            
            {(prescription.status === 'fulfilled' || prescription.status === 'ready') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleRequestRefill}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Request Refill
              </Button>
            )}

            {prescription.pharmacy_notes && (
              <div className="mt-4 text-sm">
                <h4 className="font-medium mb-1">Pharmacy Notes:</h4>
                <p className="text-muted-foreground">{prescription.pharmacy_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PrescriptionStatus;
