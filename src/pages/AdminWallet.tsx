
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { WalletCard } from '@/components/payment/WalletCard';
import { PaymentSimulator } from '@/components/payment/PaymentSimulator';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const AdminWallet: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(1000); // Simulated balance
  
  // Check if user has admin privileges
  const isAdmin = isAuthenticated && user && (
    'admin_level' in user ? Boolean(user.admin_level) : false
  );
  
  // Redirect if not authenticated or not an admin
  React.useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to access this page");
      navigate("/login");
    } else if (!isAdmin) {
      toast.error("You don't have permission to access this page");
      navigate("/");
    }
  }, [isAuthenticated, isAdmin, navigate]);
  
  const handleAddFunds = async (amount: number): Promise<void> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        setBalance(prevBalance => prevBalance + amount);
        resolve();
      }, 1500);
    });
  };
  
  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Financial Management</h1>
        <p className="text-muted-foreground">
          Manage funds and simulate payment processes
        </p>
      </div>
      
      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="payment-simulator">Payment Simulator</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wallet" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <WalletCard />
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common admin financial operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Generate Financial Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Process Refund
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Manage Transaction Settings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Approve Pending Transactions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
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
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Review and manage payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-4 bg-muted/50 p-3 font-medium">
                  <div>Date</div>
                  <div>Description</div>
                  <div>Amount</div>
                  <div>Status</div>
                </div>
                <div className="divide-y">
                  <div className="grid grid-cols-4 p-3">
                    <div className="text-sm">2025-04-14</div>
                    <div className="text-sm">Card Payment</div>
                    <div className="text-sm">$50.00</div>
                    <div><span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Success</span></div>
                  </div>
                  <div className="grid grid-cols-4 p-3">
                    <div className="text-sm">2025-04-13</div>
                    <div className="text-sm">Mobile Money Payment</div>
                    <div className="text-sm">$25.50</div>
                    <div><span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Success</span></div>
                  </div>
                  <div className="grid grid-cols-4 p-3">
                    <div className="text-sm">2025-04-12</div>
                    <div className="text-sm">Card Payment</div>
                    <div className="text-sm">$120.00</div>
                    <div><span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Pending</span></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminWallet;
