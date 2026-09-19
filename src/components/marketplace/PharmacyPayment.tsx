import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Pill, DollarSign, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useDPOPayment } from "@/hooks/useDPOPayment";
import { useWalletPayment } from "@/hooks/useWalletPayment";
import type { Order } from "@/types/marketplace";

interface PharmacyPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
}

export const PharmacyPayment = ({ order, onPaymentSuccess }: PharmacyPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'dpo' | 'wallet'>('dpo');
  const { formatPrice, convertForCharge } = useCurrency();
  const { redirectToCheckout } = useDPOPayment();
  const { balance: walletBalance, paying: walletPaying, pay: payWithWallet } = useWalletPayment();

  const orderTotal = Number(order?.total_amount ?? 0);

  const handlePayment = async () => {
    if (orderTotal <= 0) {
      toast.error("Nothing to pay for this order.");
      return;
    }
    setLoading(true);
    try {
      if (payMethod === 'wallet') {
        if (walletBalance < orderTotal) {
          toast.error("Insufficient wallet balance — top up or pay with DPO.");
          setLoading(false);
          return;
        }
        // Wallet is ZMW-denominated: canonical amount, ZMW currency.
        const ok = await payWithWallet({
          amount: orderTotal,
          currency: 'ZMW',
          orderId: order?.id,
          description: `Medicine Order Payment - Order #${order?.id}`,
        });
        setLoading(false);
        if (ok) onPaymentSuccess();
        return;
      }
      // Gateway charge: converted amount paired with its currency.
      const charge = convertForCharge(orderTotal);
      await redirectToCheckout({
        amount: charge.amount,
        currency: charge.currency,
        reference_type: 'pharmacy_sale',
        reference_id: order?.id,
        description: `Medicine Order Payment - Order #${order?.id}`,
        customer_phone: (order as any)?.patient_phone,
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
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMethod('dpo')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${payMethod === 'dpo' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <CreditCard className="h-4 w-4" /> Card
              <span className="mx-0.5">•</span>
              <Smartphone className="h-4 w-4" /> MoMo
            </button>
            <button
              type="button"
              onClick={() => setPayMethod('wallet')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${payMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Wallet className="h-4 w-4" /> Wallet ({formatPrice(walletBalance)})
            </button>
          </div>
          {payMethod === 'wallet' && walletBalance < orderTotal && (
            <p className="text-xs font-medium text-destructive">
              Insufficient balance — top up your wallet or pay with DPO.
            </p>
          )}
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading || walletPaying || order.status !== 'pending'}
          className="w-full"
        >
          {loading || walletPaying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing Payment...
            </>
          ) : payMethod === 'wallet' ? (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Pay {formatPrice(orderTotal)} from Wallet
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