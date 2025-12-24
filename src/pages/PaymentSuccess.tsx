import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletTopUp, setIsWalletTopUp] = useState(false);

  const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId');
  const status = searchParams.get('status');
  const token = searchParams.get('token'); // PayPal token
  const PayerID = searchParams.get('PayerID'); // PayPal payer ID

  useEffect(() => {
    const handlePaymentCompletion = async () => {
      try {
        if (paymentId && (status === 'success' || status === 'mock_success')) {
          // PayPal payment completion - need to capture it
          console.log('Capturing PayPal payment:', paymentId);

          const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
            body: {
              paymentId: paymentId,
              paypalOrderId: token || 'mock-order-id' // token is the order ID in PayPal return URL
            }
          });

          if (error) throw error;

          if (data && data.success) {
            toast.success("Payment captured successfully!");

            // Check if it was a wallet top-up
            const { data: paymentData } = await supabase
              .from('payments')
              .select('service_id')
              .eq('id', paymentId)
              .single();

            if (paymentData?.service_id === 'wallet_topup') {
              setIsWalletTopUp(true);
            }
          } else {
            throw new Error(data?.error || "Failed to capture payment");
          }
        } else if (token && PayerID) {
          // Legacy PayPal flow
          toast.success("Payment completed successfully!");
        } else if (paymentId) {
          // Wallet payment completion (direct)
          toast.success("Payment processed successfully!");
        } else {
          // No valid payment parameters
          toast.error("Invalid payment session");
          navigate("/");
          return;
        }
      } catch (error) {
        console.error('Payment completion error:', error);
        toast.error(error instanceof Error ? error.message : "Failed to complete payment");
      } finally {
        setIsLoading(false);
      }
    };

    handlePaymentCompletion();
  }, [token, PayerID, paymentId, status, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Finalizing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-bounce">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;