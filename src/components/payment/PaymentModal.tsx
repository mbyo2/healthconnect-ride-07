
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayment } from "@/services/payment";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

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

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await createPayment({
        amount,
        currency: "USD",
        serviceId,
        providerId,
        patientId,
        redirectUrl: window.location.origin + "/appointments"
      });

      if (response.success) {
        toast.success("Payment initiated");
        
        // Redirect to payment page
        window.location.href = response.paymentUrl;
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast.error("Payment failed. Please try again.");
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
          
          <div className="text-sm text-muted-foreground">
            You will be redirected to a secure payment page to complete your payment.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handlePayment} 
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingScreen /> Processing...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
