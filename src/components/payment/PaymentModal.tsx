
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { processWalletPayment } from "@/utils/payment";
import { getUserWallet, checkWalletBalance } from "@/services/payment";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  serviceId: string;
  providerId: string;
  patientId: string;
}

export const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  serviceId, 
  providerId,
  patientId 
}: PaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [hasEnoughFunds, setHasEnoughFunds] = useState<boolean>(false);
  const [loadingWallet, setLoadingWallet] = useState(true);

  useEffect(() => {
    const loadWallet = async () => {
      if (!patientId) return;
      
      try {
        const wallet = await getUserWallet(patientId);
        if (wallet) {
          setWalletBalance(wallet.balance);
          setHasEnoughFunds(wallet.balance >= amount);
        }
      } catch (error) {
        console.error('Error loading wallet:', error);
        toast.error('Failed to load wallet information');
      } finally {
        setLoadingWallet(false);
      }
    };

    if (isOpen) {
      loadWallet();
    }
  }, [patientId, amount, isOpen]);

  const handlePayment = async () => {
    if (!hasEnoughFunds) {
      toast.error("Insufficient funds. Please add money to your wallet first.");
      return;
    }

    setLoading(true);
    try {
      const response = await processWalletPayment({
        amount,
        currency: "USD",
        serviceId,
        providerId,
        patientId,
        redirectUrl: window.location.origin + "/appointments"
      });

      if (response.success) {
        toast.success("Payment processed successfully from your wallet");
        setWalletBalance(response.newBalance || (walletBalance - amount));
        onClose();
      } else {
        throw new Error(response.message || "Payment failed");
      }
    } catch (error: any) {
      console.error("Payment failed:", error);
      if (error.message?.includes('Insufficient funds')) {
        toast.error(`Insufficient funds. Available: $${walletBalance}, Required: $${amount}`);
      } else {
        toast.error("Payment failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Amount</Label>
            <Input 
              value={`$${amount.toFixed(2)}`}
              disabled
              className="bg-muted"
            />
          </div>

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
                  Payment will be deducted from your wallet balance.
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
        </div>
        <DialogFooter className="flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button 
              onClick={handlePayment} 
              disabled={loading || loadingWallet || !hasEnoughFunds}
              className="flex-1"
              variant={hasEnoughFunds ? "default" : "secondary"}
            >
              {loading ? (
                <>
                  <LoadingScreen /> Processing...
                </>
              ) : !hasEnoughFunds ? (
                "Insufficient Funds"
              ) : (
                "Pay from Wallet"
              )}
            </Button>
          </div>
          
          {!hasEnoughFunds && !loadingWallet && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.open('/wallet', '_blank')}
            >
              Add Funds to Wallet
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
