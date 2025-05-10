
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { generateReceipt } from '@/utils/payment';
import { useNetwork } from '@/hooks/use-network';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { supabase } from '@/integrations/supabase/client';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  payment_method: string;
  invoice_number?: string;
  service_name?: string;
}

export const PaymentHistory = ({ userId }: { userId: string }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOnline } = useNetwork();
  
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      
      try {
        // We need to be online to fetch payments
        if (!isOnline) {
          setLoading(false);
          return;
        }
        
        // Fetch from Supabase if online
        const { data, error } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            currency,
            status,
            created_at,
            payment_method,
            invoice_number,
            service:healthcare_services(name)
          `)
          .eq('patient_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        const formattedPayments = data.map((payment: any) => ({
          ...payment,
          service_name: payment.service?.name || 'Consultation'
        }));
        
        setPayments(formattedPayments);
      } catch (error) {
        console.error('Error fetching payment history:', error);
        toast.error('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayments();
  }, [userId, isOnline]);
  
  const handleGenerateReceipt = async (paymentId: string) => {
    try {
      await generateReceipt(paymentId);
      toast.success('Receipt generated successfully');
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Payment History
          </CardTitle>
          <CardDescription>View your past transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Payment History
        </CardTitle>
        <CardDescription>View your past transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-yellow-700">You're offline. Payment history is not available.</p>
          </div>
        )}
        
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No payment history available.</p>
            {!isOnline && <p className="text-sm mt-2">Connect to the internet to view your latest payments.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <div className="bg-muted/50 p-3 font-medium grid grid-cols-5 md:grid-cols-6">
                <div>Date</div>
                <div>Service</div>
                <div className="text-right">Amount</div>
                <div className="hidden md:block text-center">Method</div>
                <div className="text-center">Status</div>
                <div className="text-right">Action</div>
              </div>
              <div className="divide-y">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-3 grid grid-cols-5 md:grid-cols-6 items-center">
                    <div className="text-sm">{formatDate(payment.created_at)}</div>
                    <div className="text-sm">{payment.service_name}</div>
                    <div className="text-sm text-right">
                      {payment.currency ? payment.currency.toUpperCase() : 'USD'} {payment.amount.toFixed(2)}
                    </div>
                    <div className="hidden md:block text-xs text-center capitalize">
                      {payment.payment_method || 'Card'}
                    </div>
                    <div className="flex justify-center">
                      <Badge variant="outline" className={`${getStatusColor(payment.status)} border-none text-xs`}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-end">
                      {payment.status === 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleGenerateReceipt(payment.id)}
                          disabled={!isOnline}
                          className="flex items-center text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
