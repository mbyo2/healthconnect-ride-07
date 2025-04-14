
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, Smartphone, Wallet } from 'lucide-react';
import { processPayment } from '@/utils/payment';

export const PaymentSimulator = () => {
  const [amount, setAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  const [currency, setCurrency] = useState<string>('USD');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  
  // Card details
  const [cardNumber, setCardNumber] = useState<string>('4242424242424242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/25');
  const [cardCvv, setCardCvv] = useState<string>('123');
  
  // Mobile money details
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [provider, setProvider] = useState<string>('mtn');
  
  const handlePayment = async () => {
    setIsLoading(true);
    
    try {
      // Simulate payment process
      const paymentDetails = {
        amount,
        currency,
        patientId: user?.id || 'guest',
        providerId: 'test-provider',
        serviceId: 'test-service',
        redirectUrl: window.location.origin
      };
      
      const response = await processPayment(paymentDetails);
      
      if (response) {
        toast.success(`Payment of ${currency} ${amount} processed successfully`);
      } else {
        toast.error('Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Payment Simulator
        </CardTitle>
        <CardDescription>
          Test payment flows without real transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <RadioGroup defaultValue={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'card' | 'mobile_money')}>
            <div className="flex gap-4">
              <div className={`border rounded-lg p-3 flex-1 cursor-pointer ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Card Payment
                    </div>
                  </Label>
                </div>
              </div>
              
              <div className={`border rounded-lg p-3 flex-1 cursor-pointer ${paymentMethod === 'mobile_money' ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mobile_money" id="mobile_money" />
                  <Label htmlFor="mobile_money" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Mobile Money
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        {paymentMethod === 'card' ? (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use 4242 4242 4242 4242 for successful test payments</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-expiry">Expiry Date</Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  type="password"
                  placeholder="123"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                placeholder="+233 XX XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select defaultValue={provider} onValueChange={setProvider}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handlePayment}
          disabled={isLoading || amount <= 0}
        >
          {isLoading ? 'Processing...' : `Pay ${currency} ${amount.toFixed(2)}`}
        </Button>
      </CardFooter>
    </Card>
  );
};
