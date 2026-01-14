
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedData, cacheData } from '@/utils/cache-manager';
import { useAuth } from '@/context/AuthContext';

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribed_date: string;
  end_date?: string;
  notes?: string;
  fulfillment_status?: 'pending' | 'processing' | 'fulfilled' | 'declined';
}

export const PrescriptionStatus = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchPrescriptions();
  }, [user?.id]);

  const fetchPrescriptions = async () => {
    if (!user?.id) return;

    try {
      // Try to get cached data first
      const cachedPrescriptions = await getCachedData(`prescriptions_${user.id}`);
      
      if (cachedPrescriptions) {
        setPrescriptions(cachedPrescriptions);
        setLoading(false);
      }

      // Always fetch fresh data
      const { data, error } = await supabase
        .from('comprehensive_prescriptions')
        .select('*')
        .eq('patient_id', user.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setPrescriptions(data as unknown as Prescription[]);
        // Cache the fresh data
        await cacheData(`prescriptions_${user.id}`, data, 30); // Cache for 30 minutes
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Being Processed</Badge>;
      case 'fulfilled':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Ready for Pickup</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Not Available</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No prescriptions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <Card key={prescription.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-md">{prescription.medication_name}</CardTitle>
              {getStatusBadge(prescription.fulfillment_status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dosage:</span>
                <span>{prescription.dosage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency:</span>
                <span>{prescription.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prescribed:</span>
                <span>{new Date(prescription.prescribed_date).toLocaleDateString()}</span>
              </div>
              {prescription.notes && (
                <div className="mt-2">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{prescription.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
