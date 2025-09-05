
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getUserWallet } from "@/services/payment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface TeleHealthPaymentProps {
  amount: number;
  consultationTitle?: string;
  consultationDuration?: number;
  patientId: string;
  providerId: string;
  serviceId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const TeleHealthPayment = ({ 
  amount = 50, // Default amount
  consultationTitle = "General Consultation", 
  consultationDuration = 30, 
  patientId,
  providerId, 
  serviceId,
  onSuccess,
  onError
}: TeleHealthPaymentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [hasEnoughFunds, setHasEnoughFunds] = useState<boolean>(false);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadWallet = async () => {
      if (!user?.id) return;
      
      try {
        await loadWalletBalance();
      } finally {
        setLoadingWallet(false);
      }
    };

    loadWallet();
  }, [user?.id, amount]);

  const loadWalletBalance = async () => {
    if (!user?.id) return;
    
    try {
      const wallet = await getUserWallet(user.id);
      if (wallet) {
        setWalletBalance(wallet.balance);
        setHasEnoughFunds(wallet.balance >= amount);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet information');
    }
  };

  const handlePayment = async () => {
    if (!hasEnoughFunds) {
      toast.error("Insufficient funds. Please add money to your wallet first.");
      return;
    }

    setIsLoading(true);
    
    try {
      const paymentDetails = {
        amount,
        currency: "USD",
        patientId,
        providerId,
        serviceId,
        paymentMethod: 'wallet' as const
      };

      // Use the new payment function that handles commission splits
      const { data, error } = await supabase.functions.invoke('process-payment-with-splits', {
        body: paymentDetails
      });

      if (error) throw error;
      
      if (data.success) {
        // Refresh wallet balance
        await loadWalletBalance();
        toast.success("Payment processed successfully with automatic commission distribution!");
        onSuccess && onSuccess();
      } else {
        toast.error(data.error || "Payment failed");
        onError && onError(new Error(data.error || "Payment failed"));
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      if (error.message?.includes('Insufficient funds')) {
        toast.error(`Insufficient funds. Available: $${walletBalance}, Required: $${amount}`);
      } else {
        toast.error("Failed to process payment. Please try again.");
      }
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
          Review your consultation details and complete payment
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

        {/* Wallet Information */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Wallet Balance</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-700">Available:</span>
            <span className="font-semibold text-blue-800">
              {loadingWallet ? "Loading..." : `$${walletBalance.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Payment Status Alert */}
        {!loadingWallet && (
          hasEnoughFunds ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You have sufficient funds for this consultation.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Insufficient funds. You need ${(amount - walletBalance).toFixed(2)} more.
                <br />
                <span className="text-sm">Please add funds to your wallet before proceeding.</span>
              </AlertDescription>
            </Alert>
          )
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
          disabled={isLoading || loadingWallet || !hasEnoughFunds}
          variant={hasEnoughFunds ? "default" : "secondary"}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Processing...</span>
            </div>
          ) : !hasEnoughFunds ? (
            "Insufficient Funds"
          ) : (
            "Pay from Wallet"
          )}
        </Button>
        
        {!hasEnoughFunds && !loadingWallet && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => window.open('/wallet', '_blank')}
          >
            Add Funds to Wallet
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
