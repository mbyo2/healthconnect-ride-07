import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pill, DollarSign, CreditCard, Smartphone } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useDPOPayment } from "@/hooks/useDPOPayment";
import type { Order } from "@/types/marketplace";

interface PharmacyPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
}

export const PharmacyPayment = ({ order, onPaymentSuccess }: PharmacyPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const { currency, formatPrice } = useCurrency();
  const { redirectToCheckout } = useDPOPayment();

  const handlePayment = async () => {
    setLoading(true);
    try {
      await redirectToCheckout({
        amount: order?.total_amount ?? 0,
        currency,
        reference_type: 'pharmacy_sale',
        reference_id: order?.id,
        description: `Medicine Order Payment - Order #${order?.id}`,
        customer_phone: order?.patient_phone,
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
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
            <span className="font-medium">{formatPrice(order?.total_amount ?? 0)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You pay the order total only — Doc' O Clock adds no fee for patients. The platform's marketplace commission
            is deducted from the pharmacy's payout.
          </p>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Payment Status:</span>
            <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
              {order.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Card payments</span>
            <span className="mx-1">•</span>
            <Smartphone className="h-4 w-4" />
            <span>Mobile money</span>
          </div>
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
              Pay with DPOpay
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};