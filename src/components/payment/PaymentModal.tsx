import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayment, generatePaymentReceipt } from "@/services/payment";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
  const { toast } = useToast();

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
        toast({
          title: "Payment initiated",
          description: "You will be redirected to the payment gateway"
        });
        
        // Redirect to DPO payment page
        window.location.href = response.paymentUrl;
      }
    } catch (error) {
      console.error("Payment failed:", error);
      toast({
        title: "Payment failed",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>Complete Payment</ModalHeader>
        <ModalBody className="space-y-4">
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
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handlePayment} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};