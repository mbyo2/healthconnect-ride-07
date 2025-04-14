
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Car, CreditCard, MapPin, Wallet } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { processPayment } from '@/utils/payment';

interface Ride {
  id: string;
  from: string;
  to: string;
  distance: number;
  price: number;
}

export const RidePayment = () => {
  const [selectedRide, setSelectedRide] = useState<Ride>({
    id: 'ride-1',
    from: 'Current Location',
    to: 'Hospital',
    distance: 5.2,
    price: 12.50
  });
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'mobile_money'>('wallet');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const rides: Ride[] = [
    {
      id: 'ride-1',
      from: 'Current Location',
      to: 'Hospital',
      distance: 5.2,
      price: 12.50
    },
    {
      id: 'ride-2',
      from: 'Home',
      to: 'Clinic',
      distance: 3.7,
      price: 8.75
    },
    {
      id: 'ride-3',
      from: 'Office',
      to: 'Pharmacy',
      distance: 1.5,
      price: 5.25
    }
  ];
  
  const handleRideSelect = (rideId: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (ride) {
      setSelectedRide(ride);
    }
  };
  
  const handlePayment = async () => {
    if (paymentMethod === 'wallet') {
      // Process wallet payment directly
      setIsLoading(true);
      try {
        await processPayment({
          amount: selectedRide.price,
          currency: 'USD',
          patientId: user?.id || 'guest',
          providerId: 'driver-1',
          serviceId: selectedRide.id
        });
        toast.success('Ride payment successful!');
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
            <Car className="h-5 w-5 text-primary" />
            Book a Ride
          </CardTitle>
          <CardDescription>
            Schedule a ride to your healthcare appointment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Choose Destination</label>
            <Select defaultValue={selectedRide.id} onValueChange={handleRideSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a ride" />
              </SelectTrigger>
              <SelectContent>
                {rides.map(ride => (
                  <SelectItem key={ride.id} value={ride.id}>
                    {ride.from} to {ride.to} ({ride.distance} km)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">From:</span>
              </div>
              <span className="font-medium">{selectedRide.from}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">To:</span>
              </div>
              <span className="font-medium">{selectedRide.to}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Distance:</span>
              <span className="font-medium">{selectedRide.distance} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Price:</span>
              <span className="font-bold">${selectedRide.price.toFixed(2)}</span>
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
            {isLoading ? 'Processing...' : `Pay $${selectedRide.price.toFixed(2)}`}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Payment Modal for card or mobile money */}
      <PaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amount={selectedRide.price}
        serviceId={selectedRide.id}
        providerId="driver-1"
        patientId={user?.id || 'guest'}
      />
    </>
  );
};
