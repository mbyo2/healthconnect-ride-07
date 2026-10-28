import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Wallet as WalletIcon, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyErrorMessage } from "@/utils/friendly-error";

interface PaymentDetails {
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  reference: string | null;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletTopUp, setIsWalletTopUp] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId');
  const status = searchParams.get('status');
  const token = searchParams.get('token'); // PayPal token
  const PayerID = searchParams.get('PayerID'); // PayPal payer ID

  useEffect(() => {
    const handlePaymentCompletion = async () => {
      try {
        if (paymentId && status === 'success') {
          // PayPal payment completion - capture must succeed server-side
          // before anything is shown as paid.
          if (!token) {
            throw new Error('Missing PayPal order reference');
          }
          const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
            body: {
              paymentId: paymentId,
              paypalOrderId: token // token is the order ID in PayPal return URL
            }
          });

          if (error) throw error;

          if (data && data.success) {
            toast.success("Payment captured successfully!");

            // Check if it was a wallet top-up and load receipt details
            const { data: paymentData } = await supabase
              .from('payments')
              .select('metadata, amount, currency, payment_method, reference, transaction_id')
              .eq('id', paymentId)
              .single();

            if (paymentData) {
              setPaymentDetails({
                amount: (paymentData as any).amount ?? null,
                currency: (paymentData as any).currency ?? 'ZMW',
                payment_method: (paymentData as any).payment_method ?? null,
                reference: (paymentData as any).reference ?? (paymentData as any).transaction_id ?? paymentId,
              });
            }

            const requestedServiceId =
              paymentData?.metadata && typeof paymentData.metadata === 'object'
                ? (paymentData.metadata as any).requested_service_id
                : null;

            if (requestedServiceId === 'wallet_topup') {
              setIsWalletTopUp(true);
            }
          } else {
            throw new Error(data?.error || "Failed to capture payment");
          }
        } else if (token && PayerID) {
          // Legacy PayPal return without a payment reference — never claim
          // success without server verification; point at the dashboard.
          toast.info("Payment return received — check your dashboard for confirmation.");
          navigate("/dashboard");
          return;
        } else if (paymentId) {
          // Wallet payment completion (direct) — never claim success without
          // verifying the payment row; a cancel return lands here too.
          const { data: paymentRow } = await supabase
            .from('payments')
            .select('status, amount, currency, payment_method, reference, transaction_id')
            .eq('id', paymentId)
            .maybeSingle();
          if (paymentRow?.status === 'completed') {
            toast.success("Payment processed successfully!");
            setPaymentDetails({
              amount: (paymentRow as any).amount ?? null,
              currency: (paymentRow as any).currency ?? 'ZMW',
              payment_method: (paymentRow as any).payment_method ?? null,
              reference: (paymentRow as any).reference ?? (paymentRow as any).transaction_id ?? paymentId,
            });
          } else {
            toast.info("Payment not confirmed yet — check your wallet for the updated balance.");
            navigate("/wallet");
            return;
          }
        } else {
          // No valid payment parameters
          toast.error("Invalid payment session");
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error('Payment completion error:', error);
        toast.error(friendlyErrorMessage(error, "Failed to complete payment"));
      } finally {
        setIsLoading(false);
      }
    };

    handlePaymentCompletion();
  }, [token, PayerID, paymentId, status, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Finalizing payment">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" aria-hidden></div>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Finalizing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">Payment Successful!</CardTitle>
          <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
            {isWalletTopUp
              ? "Your wallet has been topped up successfully."
              : "Your payment has been processed successfully."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {paymentDetails && (paymentDetails.amount != null || paymentDetails.reference) && (
            <div className="rounded-xl border p-4 space-y-2 bg-muted/40 dark:bg-slate-900">
              {paymentDetails.amount != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount paid</span>
                  <span className="text-lg font-bold">
                    {paymentDetails.currency} {Number(paymentDetails.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {paymentDetails.payment_method && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment method</span>
                  <span className="text-sm font-medium capitalize">{paymentDetails.payment_method.replace(/_/g, ' ')}</span>
                </div>
              )}
              {paymentDetails.reference && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Reference</span>
                  <span className="text-xs font-mono truncate" title={paymentDetails.reference}>{paymentDetails.reference}</span>
                </div>
              )}
            </div>
          )}
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
              {isWalletTopUp
                ? "The funds are now available in your wallet for consultations and medicine orders."
                : "You will receive a confirmation shortly. You can view your transaction details in your dashboard."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {isWalletTopUp ? (
              <Button
                onClick={() => navigate("/wallet")}
                className="w-full h-12 font-bold shadow-lg"
              >
                <WalletIcon className="h-4 w-4 mr-2" />
                Go to My Wallet
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/appointments")}
                className="w-full h-12 font-bold shadow-lg"
              >
                View My Appointments
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full h-12 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>

            {paymentId && (
              <Button
                variant="outline"
                onClick={() => navigate(`/billing?receipt=${paymentId}`)}
                className="w-full min-h-[44px]"
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;