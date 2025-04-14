
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, Video, Wallet } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { processPayment } from '@/utils/payment';

interface ConsultationType {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export const TeleHealthPayment = () => {
  const consultationTypes: ConsultationType[] = [
    {
      id: 'consult-1',
      name: 'Regular Consultation',
      duration: 15,
      price: 25.00
    },
    {
      id: 'consult-2',
      name: 'Extended Consultation',
      duration: 30,
      price: 45.00
    },
    {
      id: 'consult-3',
      name: 'Specialist Consultation',
      duration: 45,
      price: 75.00
    }
  ];

  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationType>(consultationTypes[0]);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'mobile_money'>('wallet');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const handleConsultationSelect = (consultationId: string) => {
    const consultation = consultationTypes.find(c => c.id === consultationId);
    if (consultation) {
      setSelectedConsultation(consultation);
    }
  };
  
  const handlePayment = async () => {
    if (paymentMethod === 'wallet') {
      // Process wallet payment directly
      setIsLoading(true);
      try {
        await processPayment({
          amount: selectedConsultation.price,
          currency: 'USD',
          patientId: user?.id || 'guest',
          providerId: 'doctor-1',
          serviceId: selectedConsultation.id,
          redirectUrl: window.location.href
        });
        toast.success('Payment successful! Your consultation has been booked.');
        // In a real app, you'd navigate to a confirmation screen
      } catch (error) {
        console.error('Payment failed:', error);
        toast.error('Payment failed. Please try another payment method.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Open payment modal for card or mobile money
      setIsModalOpen(true);
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Telehealth Consultation
          </CardTitle>
          <CardDescription>
            Book a virtual consultation with a healthcare provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Consultation Type</label>
            <Select defaultValue={selectedConsultation.id} onValueChange={handleConsultationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select consultation type" />
              </SelectTrigger>
              <SelectContent>
                {consultationTypes.map(consultation => (
                  <SelectItem key={consultation.id} value={consultation.id}>
                    {consultation.name} ({consultation.duration} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Consultation Type:</span>
              <span className="font-medium">{selectedConsultation.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Duration:</span>
              <span className="font-medium">{selectedConsultation.duration} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Price:</span>
              <span className="font-bold">${selectedConsultation.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <Select defaultValue={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'wallet' | 'card' | 'mobile_money')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" /> Wallet Balance
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Card Payment
                  </div>
                </SelectItem>
                <SelectItem value="mobile_money">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary/10 p-1 rounded">MM</span> Mobile Money
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handlePayment} disabled={isLoading}>
            {isLoading ? 'Processing...' : `Pay $${selectedConsultation.price.toFixed(2)}`}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Payment Modal for card or mobile money */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={selectedConsultation.price}
        serviceId={selectedConsultation.id}
        providerId="doctor-1"
        patientId={user?.id || 'guest'}
      />
    </>
  );
};
