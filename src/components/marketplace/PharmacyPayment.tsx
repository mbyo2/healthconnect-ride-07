import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Pill, Smartphone, Wallet, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useLencoPayment, LENCO_OPERATORS, type LencoOperator } from "@/hooks/useLencoPayment";
import { useWalletPayment } from "@/hooks/useWalletPayment";
import { peekPendingAction, takePendingAction } from "@/utils/pendingAction";
import { FlowResult } from "@/components/ui/flow-result";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/marketplace";

interface PharmacyPaymentProps {
  order: Order;
  onPaymentSuccess: () => void;
}

export const PharmacyPayment = ({ order, onPaymentSuccess }: PharmacyPaymentProps) => {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'lenco' | 'wallet'>('lenco');
  const [payError, setPayError] = useState<string | null>(null);
  const [lencoPhone, setLencoPhone] = useState('');
  const [lencoOperator, setLencoOperator] = useState<LencoOperator>('mtn');
  const [lencoReference, setLencoReference] = useState<string | null>(null);
  const [lencoMessage, setLencoMessage] = useState('');
  const [pharmacyOwnMode, setPharmacyOwnMode] = useState(false);
  const resumedRef = useRef(false);

  // Check if the pharmacy is in 'own' (HMS-only) payment mode
  useEffect(() => {
    const checkMode = async () => {
      if (!order?.pharmacy_id) return;
      const { data } = await supabase
        .from("healthcare_institutions")
        .select("payment_mode")
        .eq("id", order.pharmacy_id)
        .maybeSingle();
      setPharmacyOwnMode(data?.payment_mode === "own");
    };
    checkMode();
  }, [order?.pharmacy_id]);

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
  const { formatPrice } = useCurrency();
  const { createCollection, verifyPayment, verifying } = useLencoPayment();
  const { balance: walletBalance, paying: walletPaying, pay: payWithWallet } = useWalletPayment();

  const orderTotal = Number(order?.total_amount ?? 0);

  const checkLencoStatus = async () => {
    if (!lencoReference) return;
    const r = await verifyPayment(lencoReference);
    if (!r) return;
    if (r.status === 'paid') {
      toast.success("Payment confirmed — your order is being processed.");
      setLencoReference(null);
      onPaymentSuccess();
    } else if (r.status === 'failed' || r.status === 'cancelled') {
      toast.error("This payment did not complete. You can try again.");
      setLencoReference(null);
    } else {
      toast.info(r.message || "Still waiting — approve the prompt on your phone, then check again.");
    }
  };

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
          toast.error("Insufficient wallet balance — top up or pay with Mobile Money.");
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
      // Mobile Money collection (Lenco): ZMW-canonical amount, prompt goes to
      // the customer's phone — they approve there, then tap "I've approved".
      const zmwAmount = Math.round(orderTotal * 100) / 100;
      if (lencoPhone.replace(/\D/g, '').length < 9) {
        toast.error("Enter the mobile-money phone number that will approve this payment");
        setLoading(false);
        return;
      }
      const res = await createCollection({
        amount: zmwAmount,
        currency: 'ZMW',
        reference_type: 'pharmacy_sale',
        reference_id: order?.id,
        description: `Medicine Order Payment - Order #${order?.id}`,
        phone: lencoPhone,
        operator: lencoOperator,
        country: 'zm',
      });
      setLoading(false);
      if (res?.reference) {
        setLencoReference(res.reference);
        setLencoMessage(res.message || 'Approve the payment on your phone, then tap "I\'ve approved".');
        if (res.status === 'paid') {
          toast.success("Payment confirmed — your order is being processed.");
          setLencoReference(null);
          onPaymentSuccess();
        }
      }
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
      <CardContent>
        {pharmacyOwnMode ? (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="font-semibold">Pay at the pharmacy directly</p>
            <p className="text-sm text-muted-foreground">
              This pharmacy handles its own payments. Please pay them directly when you collect your medicines.
            </p>
            <Button onClick={onPaymentSuccess} variant="outline">
              I've arranged payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
              aria-pressed={payMethod === 'lenco'}
              onClick={() => { setPayError(null); setLencoReference(null); setPayMethod('lenco'); }}
              className={`flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${payMethod === 'lenco' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Smartphone className="h-4 w-4" /> Mobile Money
            </button>
            <button
              type="button"
              aria-pressed={payMethod === 'wallet'}
              onClick={() => { setPayError(null); setLencoReference(null); setPayMethod('wallet'); }}
              className={`flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border text-xs font-bold transition-all ${payMethod === 'wallet' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              <Wallet className="h-4 w-4" /> Wallet ({formatPrice(walletBalance)})
            </button>
          </div>
          {payMethod === 'lenco' && !lencoReference && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Operator</span>
                <select
                  aria-label="Mobile money operator"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={lencoOperator}
                  onChange={(e) => setLencoOperator(e.target.value as LencoOperator)}
                >
                  {LENCO_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label} ({op.hint})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">MoMo phone number</span>
                <input
                  type="tel"
                  placeholder="0971234567"
                  aria-label="Mobile money phone number"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={lencoPhone}
                  onChange={(e) => setLencoPhone(e.target.value)}
                />
              </div>
            </div>
          )}
          {payMethod === 'lenco' && lencoReference && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <p className="text-sm font-semibold">Check your phone</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{lencoMessage}</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={verifying}
                  onClick={checkLencoStatus}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "I've approved — check status"
                  )}
                </Button>
                <Button variant="outline" onClick={() => setLencoReference(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {payMethod === 'wallet' && walletBalance < orderTotal && (
            <p className="text-xs font-medium text-destructive">
              Insufficient balance — top up your wallet or pay with Mobile Money.
            </p>
          )}
        </div>

        {order.status !== 'pending' && (
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            This order is {order.status} — no further payment needed.
          </p>
        )}

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
              <Smartphone className="h-4 w-4 mr-2" />
              Pay with Mobile Money
            </>
          )}
        </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};