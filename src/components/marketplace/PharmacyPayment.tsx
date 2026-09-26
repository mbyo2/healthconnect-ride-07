import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Pill, DollarSign, CreditCard, Smartphone, Wallet } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useDPOPayment } from "@/hooks/useDPOPayment";
import { useWalletPayment } from "@/hooks/useWalletPayment";
import { peekPendingAction, takePendingAction } from "@/utils/pendingAction";
import { FlowResult } from "@/components/ui/flow-result";
import type { Order } from "@/types/marketplace";

interface PharmacyPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
}

export const PharmacyPayment = ({ order, onPaymentSuccess }: PharmacyPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'dpo' | 'wallet'>('dpo');
  const [payError, setPayError] = useState<string | null>(null);
  const resumedRef = useRef(false);

  // Post-login resume: restore the checkout the user left, then let them
  // confirm payment explicitly. Money never moves without a tap. Only
  // consume intents parked for this exact route.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const pending = peekPendingAction();
    const here = `${window.location.pathname}${window.location.search}`;
    if (pending?.kind === 'checkout' && pending.returnTo === here) {
      takePendingAction();
      setPayMethod('wallet');
      toast.success('Welcome back — review and confirm your payment.');
    }
  }, []);
  const { formatPrice, convertForCharge } = useCurrency();
  const { redirectToCheckout } = useDPOPayment();
  const { balance: walletBalance, paying: walletPaying, pay: payWithWallet } = useWalletPayment();

  const orderTotal = Number(order?.total_amount ?? 0);

  const handlePayment = async () => {
    if (orderTotal <= 0) {
      toast.error("Nothing to pay for this order.");
      return;
    }
    setPayError(null);
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
      setPayError(
        error instanceof Error && error.message
          ? error.message
          : "Payment failed. No money moved — try again or switch method."
      );
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
          
          {payError && (
            <FlowResult
              status="error"
              title="Payment didn't go through"
              description={payError}
              onRetry={() => { setPayError(null); handlePayment(); }}
              retryLabel="Try Payment Again"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={payMethod === 'dpo'}
              onClick={() => { setPayError(null); setPayMethod('dpo'); }}
              className={`flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${payMethod === 'dpo' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <CreditCard className="h-4 w-4" /> Card
              <span className="mx-0.5">•</span>
              <Smartphone className="h-4 w-4" /> MoMo
            </button>
            <button
              type="button"
              aria-pressed={payMethod === 'wallet'}
              onClick={() => { setPayError(null); setPayMethod('wallet'); }}
              className={`flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${payMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
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
          className="w-full min-h-[44px]"
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