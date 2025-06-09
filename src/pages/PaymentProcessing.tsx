
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeleHealthPayment } from '@/components/payment/TeleHealthPayment';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone, Building, DollarSign, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const PaymentProcessing = () => {
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [amount, setAmount] = useState(50);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const mockProviders = [
    { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology' },
    { id: '2', name: 'Dr. Michael Chen', specialty: 'Pediatrics' },
    { id: '3', name: 'Dr. Emma Wilson', specialty: 'Dermatology' }
  ];

  const services = [
    { id: 'consultation', name: 'Video Consultation', price: 50, duration: 30 },
    { id: 'follow-up', name: 'Follow-up Visit', price: 30, duration: 15 },
    { id: 'emergency', name: 'Emergency Consultation', price: 100, duration: 20 }
  ];

  const handlePaymentSuccess = () => {
    toast.success('Payment processed successfully!');
    // Here you would typically redirect to a success page or update the UI
  };

  const handlePaymentError = (error: Error) => {
    toast.error(`Payment failed: ${error.message}`);
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access payment processing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Payment Processing</h1>
        <p className="text-muted-foreground">Secure payments for healthcare services</p>
      </div>

      <Tabs defaultValue="consultation" className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consultation">Video Consultation</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="consultation" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Provider & Service
                </CardTitle>
                <CardDescription>Choose your healthcare provider and service type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="provider">Healthcare Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} - {provider.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service">Service Type</Label>
                  <Select value={selectedService} onValueChange={(value) => {
                    setSelectedService(value);
                    const service = services.find(s => s.id === value);
                    if (service) setAmount(service.price);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{service.name}</span>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="outline">${service.price}</Badge>
                              <Badge variant="secondary">{service.duration}min</Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedProvider && selectedService && (
              <TeleHealthPayment
                amount={amount}
                consultationTitle={services.find(s => s.id === selectedService)?.name}
                consultationDuration={services.find(s => s.id === selectedService)?.duration}
                patientId={user.id}
                providerId={selectedProvider}
                serviceId={selectedService}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Manage your payment methods and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                    </div>
                  </div>
                  <Badge>Available</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-medium">Mobile Money</p>
                      <p className="text-sm text-muted-foreground">M-Pesa, Airtel Money, MTN Mobile Money</p>
                    </div>
                  </div>
                  <Badge>Available</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building className="h-8 w-8 text-purple-500" />
                    <div>
                      <p className="font-medium">Bank Transfer</p>
                      <p className="text-sm text-muted-foreground">Direct bank account transfer</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>View your past transactions and receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No payment history available</p>
                <p className="text-sm">Your completed payments will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentProcessing;
