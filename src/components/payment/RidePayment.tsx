
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { processPayment } from "@/utils/payment";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

interface RidePaymentProps {
  amount: number;
  origin?: string;
  destination?: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const RidePayment = ({ 
  amount, 
  origin, 
  destination, 
  patientId, 
  providerId, 
  serviceId,
  onSuccess,
  onError
}: RidePaymentProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      const result = await processPayment({
        amount,
        currency: "USD",
        patientId,
        providerId,
        serviceId,
        redirectUrl: window.location.origin + "/appointments"
      });
      
      if (result.success) {
        toast.success("Payment processed successfully");
        onSuccess && onSuccess();
      } else {
        throw new Error("Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to process payment. Please try again.");
      onError && onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Review your ride details and complete payment
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {origin && destination && (
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm flex justify-between">
              <span className="text-muted-foreground">Pickup:</span>
              <span className="font-medium">{origin}</span>
            </div>
            <div className="text-sm flex justify-between mt-2">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-medium">{destination}</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center border-t border-b py-3">
          <span className="text-muted-foreground">Total Amount:</span>
          <span className="text-xl font-semibold">${amount.toFixed(2)}</span>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-3">
        <Button 
          className="w-full" 
          onClick={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingScreen /> Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
