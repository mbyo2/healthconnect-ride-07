
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, Calendar, User, Clock, Download } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Prescriptions = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      fetchPrescriptions();
    }
  }, [user]);

  const fetchPrescriptions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('comprehensive_prescriptions')
        .select(`
          id,
          medication_name,
          dosage,
          duration_days,
          prescribed_date,
          status,
          refills_remaining,
          instructions,
          provider:profiles!comprehensive_prescriptions_provider_id_fkey(first_name, last_name)
        `)
        .eq('patient_id', user?.id)
        .order('prescribed_date', { ascending: false });

      if (error) throw error;

      const rows: any[] = data || [];

      setPrescriptions(
        rows.map((p) => ({
          id: p.id,
          medication: p.medication_name,
          prescriber: p.provider ? `Dr. ${p.provider.first_name} ${p.provider.last_name}` : 'Unknown Provider',
          dosage: p.dosage,
          duration: p.duration_days ? `${p.duration_days} days` : 'As directed',
          prescribedDate: p.prescribed_date,
          status: p.status || 'active',
          refillsRemaining: p.refills_remaining || 0,
          instructions: p.instructions
        }))
      );
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200';
      case 'completed': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      case 'expired': return 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200';
      default: return 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading prescriptions...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">My Prescriptions</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Track and manage your medication prescriptions
        </p>
      </div>

      <div className="grid gap-6">
        {prescriptions.map((prescription) => (
          <Card key={prescription.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Pill className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-foreground">{prescription.medication}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      Prescribed by {prescription.prescriber}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(prescription.status)}>
                  {prescription.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Dosage</h4>
                  <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Duration</h4>
                  <p className="text-sm text-muted-foreground">{prescription.duration}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Refills Remaining</h4>
                  <p className="text-sm text-muted-foreground">{prescription.refillsRemaining}</p>
                </div>
              </div>

              {prescription.instructions && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <h4 className="font-medium text-sm mb-1">Instructions</h4>
                  <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Prescribed on {new Date(prescription.prescribedDate).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                {prescription.status === 'active' && prescription.refillsRemaining > 0 && (
                  <Button size="sm">
                    Request Refill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {prescriptions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No prescriptions found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Prescriptions;
