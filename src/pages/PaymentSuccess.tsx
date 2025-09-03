import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const paymentId = searchParams.get('paymentId');
  const token = searchParams.get('token'); // PayPal token
  const PayerID = searchParams.get('PayerID'); // PayPal payer ID

  useEffect(() => {
    if (token && PayerID) {
      // PayPal payment completion
      toast.success("Payment completed successfully!");
      setIsLoading(false);
    } else if (paymentId) {
      // Wallet payment completion
      toast.success("Payment processed from your wallet!");
      setIsLoading(false);
    } else {
      // No valid payment parameters
      toast.error("Invalid payment session");
      navigate("/");
    }
  }, [token, PayerID, paymentId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Payment Successful!</CardTitle>
          <CardDescription>
            Your consultation payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              You will receive a confirmation email shortly with your appointment details.
              You can also view your upcoming appointments in your dashboard.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/appointments")}
              className="w-full"
            >
              View My Appointments
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full"
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