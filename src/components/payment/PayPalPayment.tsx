import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { processPayment } from "@/utils/payment";
import { toast } from "sonner";
import { CreditCard, ExternalLink } from "lucide-react";

export interface PayPalPaymentProps {
  amount: number;
  consultationTitle?: string;
  consultationDuration?: number;
  patientId: string;
  providerId: string;
  serviceId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const PayPalPayment = ({ 
  amount = 50,
  consultationTitle = "General Consultation", 
  consultationDuration = 30, 
  patientId,
  providerId, 
  serviceId,
  onSuccess,
  onError
}: PayPalPaymentProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayPalPayment = async () => {
    setIsLoading(true);
    
    try {
      const result = await processPayment({
        amount,
        currency: "USD",
        patientId,
        providerId,
        serviceId,
        paymentMethod: 'paypal',
        redirectUrl: window.location.origin + "/payment-success"
      });
      
      if (result.success && result.paymentUrl) {
        toast.success("Redirecting to PayPal...");
        // Redirect to PayPal for payment approval
        window.location.href = result.paymentUrl;
      } else {
        throw new Error(result.message || "Failed to initialize PayPal payment");
      }
    } catch (error: any) {
      console.error("PayPal payment error:", error);
      toast.error("Failed to initialize PayPal payment. Please try again.");
      onError && onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pay with PayPal
        </CardTitle>
        <CardDescription>
          Secure payment processing through PayPal
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {consultationTitle && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm flex justify-between">
              <span className="text-muted-foreground">Consultation:</span>
              <span className="font-medium">{consultationTitle}</span>
            </div>
            {consultationDuration && (
              <div className="text-sm flex justify-between mt-2">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{consultationDuration} minutes</span>
              </div>
            )}
          </div>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You'll be redirected to PayPal to complete your payment securely.
            Accepted: Credit cards, debit cards, and PayPal balance.
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-between items-center border-t border-b py-3">
          <span className="text-muted-foreground">Total Amount:</span>
          <span className="text-xl font-semibold">${amount.toFixed(2)}</span>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white" 
          onClick={handlePayPalPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span>Pay with PayPal</span>
              <ExternalLink className="h-4 w-4" />
            </div>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};