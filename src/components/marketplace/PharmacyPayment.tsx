import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pill, DollarSign } from "lucide-react";
import type { Order } from "@/types/marketplace";

interface PharmacyPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
}

export const PharmacyPayment = ({ order, onPaymentSuccess }: PharmacyPaymentProps) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment-with-splits', {
        body: {
          amount: order.total_amount,
          currency: 'USD',
          patientId: order.patient_id,
          providerId: order.pharmacy_id, // Pharmacy as provider
          serviceId: order.id,
          institutionId: order.pharmacy_id,
          paymentMethod: 'wallet',
          paymentType: 'pharmacy'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Payment processed successfully!');
        onPaymentSuccess();
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          <CardTitle>Medicine Order Payment</CardTitle>
        </div>
        <CardDescription>
          Complete payment for your medicine order
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Order Total:</span>
            <span className="font-medium">${order.total_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pharmacy Commission (5%):</span>
            <span>${(order.total_amount * 0.05).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Platform Fee (10%):</span>
            <span>${(order.total_amount * 0.10).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Pharmacy Revenue:</span>
            <span>${(order.total_amount * 0.85).toFixed(2)}</span>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <span className="font-medium">Payment Status:</span>
          <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
            {order.status}
          </Badge>
        </div>
        
        <Button 
          onClick={handlePayment} 
          disabled={loading || order.status !== 'pending'}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <DollarSign className="h-4 w-4 mr-2" />
              Pay ${order.total_amount.toFixed(2)}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};