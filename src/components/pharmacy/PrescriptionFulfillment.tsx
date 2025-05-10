
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { logAnalyticsEvent } from '@/utils/analytics-service';

interface PrescriptionItem {
  id?: string;
  medication_name?: string;
  patient_id?: string;
  dosage?: string;
  frequency?: string;
  notes?: string;
  prescribed_by?: string;
  prescribed_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  // Custom properties for fulfillment
  status?: string;
}

export const PrescriptionFulfillment = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPrescriptions(data || []);
      
      // Log analytics
      logAnalyticsEvent('prescriptions_fetched', {
        count: data?.length || 0,
        status: 'pending'
      });
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFulfill = async () => {
    const selectedIds = Object.entries(selected)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
      
    if (selectedIds.length === 0) {
      toast.warning('No prescriptions selected');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'fulfilled' })
        .in('id', selectedIds);
        
      if (error) throw error;
      
      toast.success(`${selectedIds.length} prescriptions fulfilled`);
      setSelected({});
      fetchPrescriptions();
      
      // Log analytics
      logAnalyticsEvent('prescriptions_fulfilled', {
        count: selectedIds.length,
        prescription_ids: selectedIds
      });
    } catch (error) {
      console.error('Error fulfilling prescriptions:', error);
      toast.error('Failed to fulfill prescriptions');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleSelect = (id: string) => {
    setSelected(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const isAllSelected = 
    prescriptions.length > 0 && 
    prescriptions.every(p => p.id && selected[p.id]);
    
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelected({});
    } else {
      const newSelected: Record<string, boolean> = {};
      prescriptions.forEach(p => {
        if (p.id) newSelected[p.id] = true;
      });
      setSelected(newSelected);
    }
  };
  
  // Load prescriptions on component mount
  React.useEffect(() => {
    fetchPrescriptions();
  }, []);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Pending Prescriptions</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchPrescriptions} 
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading prescriptions...</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No pending prescriptions</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox 
                  checked={isAllSelected} 
                  onCheckedChange={toggleSelectAll} 
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
              </div>
              
              {prescriptions.map(prescription => (
                <div 
                  key={prescription.id} 
                  className="flex items-start space-x-3 p-3 rounded-md border hover:bg-accent/20"
                >
                  <Checkbox 
                    checked={prescription.id ? selected[prescription.id] : false}
                    onCheckedChange={() => prescription.id && toggleSelect(prescription.id)}
                    id={`rx-${prescription.id}`}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{prescription.medication_name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Dosage: {prescription.dosage}</p>
                      <p>Frequency: {prescription.frequency}</p>
                      {prescription.notes && <p>Notes: {prescription.notes}</p>}
                      <p className="text-xs">
                        Prescribed by Dr. {prescription.prescribed_by} on {" "}
                        {prescription.prescribed_date && new Date(prescription.prescribed_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleFulfill} 
            disabled={loading || Object.keys(selected).length === 0}
            className="w-full"
          >
            Fulfill Selected Prescriptions
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PrescriptionFulfillment;
