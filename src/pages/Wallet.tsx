
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from '@/components/payment/WalletCard';
import { PaymentSimulator } from '@/components/payment/PaymentSimulator';
import { PaymentMethods, PaymentMethod } from '@/components/payment/PaymentMethods';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, PlusCircle } from 'lucide-react';
import { getUserWallet, addFundsToWallet } from '@/services/payment';

const Wallet: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      expiryDate: '12/25',
      isDefault: true
    }
  ]);
  
  // Check if user has admin privileges
  const isAdmin = isAuthenticated && user && (
    'admin_level' in user ? Boolean(user.admin_level) : false
  );
  
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to access your wallet");
      navigate("/login");
      return;
    }
    
    const fetchWallet = async () => {
      if (!user?.id) return;
      
      try {
        const walletData = await getUserWallet(user.id);
        if (walletData) {
          setBalance(walletData.balance);
        } else {
          // Create a default wallet for demo purposes
          setBalance(0);
        }
      } catch (error) {
        console.error("Error fetching wallet:", error);
        toast.error("Failed to load wallet information");
      } finally {
        setLoading(false);
      }
    };
    
    fetchWallet();
  }, [isAuthenticated, user, navigate]);
  
  const handleAddFunds = async (amount: number): Promise<void> => {
    if (!user?.id) {
      toast.error("You must be logged in to add funds");
      return;
    }
    
    try {
      await addFundsToWallet(user.id, amount);
      setBalance(prevBalance => prevBalance + amount);
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding funds:", error);
      toast.error("Failed to add funds to your wallet");
      return Promise.reject(error);
    }
  };
  
  const handleAddPaymentMethod = () => {
    toast.success("Payment method added successfully");
    setPaymentMethods([
      ...paymentMethods,
      {
        id: `${Date.now()}`,
        type: 'card',
        last4: '1234',
        expiryDate: '01/26',
        isDefault: false
      }
    ]);
  };
  
  const handleRemovePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
  };
  
  const handleSetDefaultMethod = (id: string) => {
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
    toast.success("Default payment method updated");
  };
  
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground">
          Manage your funds and payment methods
        </p>
      </div>
      
      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          {isAdmin && <TabsTrigger value="payment-simulator">Payment Simulator</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="wallet" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <WalletCard balance={balance} onAddFunds={handleAddFunds} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your recent wallet activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border">
                  <div className="bg-muted/50 p-3 font-medium grid grid-cols-4">
                    <div>Date</div>
                    <div>Description</div>
                    <div>Amount</div>
                    <div>Status</div>
                  </div>
                  <div className="divide-y">
                    <div className="p-3 grid grid-cols-4">
                      <div className="text-sm">2025-04-14</div>
                      <div className="text-sm">Added funds</div>
                      <div className="text-sm text-green-600">+$50.00</div>
                      <div><span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span></div>
                    </div>
                    <div className="p-3 grid grid-cols-4">
                      <div className="text-sm">2025-04-13</div>
                      <div className="text-sm">Ride payment</div>
                      <div className="text-sm text-red-600">-$25.50</div>
                      <div><span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm">
                    View All Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="payment-methods">
          <div className="grid md:grid-cols-2 gap-6">
            <PaymentMethods 
              methods={paymentMethods} 
              onAddMethod={handleAddPaymentMethod}
              onRemoveMethod={handleRemovePaymentMethod}
              onSetDefault={handleSetDefaultMethod}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Add Payment Method</CardTitle>
                <CardDescription>
                  Link a new payment option to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border p-3 rounded-md cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <PlusCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Add Credit or Debit Card</p>
                        <p className="text-xs text-muted-foreground">Securely add a new card</p>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </div>
                  
                  <div className="flex items-center justify-between border p-3 rounded-md cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <PlusCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Add Mobile Money</p>
                        <p className="text-xs text-muted-foreground">Link your mobile money account</p>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="payment-simulator">
            <div className="grid md:grid-cols-2 gap-6">
              <PaymentSimulator />
              
              <Card>
                <CardHeader>
                  <CardTitle>Payment Testing Guide</CardTitle>
                  <CardDescription>
                    How to use the payment simulator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Card Payments</h3>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Use <code>4242 4242 4242 4242</code> for successful payments</li>
                        <li>Use <code>4000 0000 0000 0002</code> to simulate declined payments</li>
                        <li>Any future expiry date is valid</li>
                        <li>Any 3-digit CVV is valid</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Mobile Money</h3>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>Use any 10+ digit phone number</li>
                        <li>All transactions are simulated</li>
                        <li>No real money is processed</li>
                        <li>Results are logged for testing purposes</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Wallet;
