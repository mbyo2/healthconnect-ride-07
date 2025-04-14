
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types/user';

export interface WalletCardProps {
  balance: number;
  currency?: string;
  onAddFunds?: (amount: number) => Promise<void>;
}

export const WalletCard = ({ 
  balance, 
  currency = 'USD', 
  onAddFunds 
}: WalletCardProps) => {
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuth();
  
  const handleAddFunds = async () => {
    if (!onAddFunds) return;
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsLoading(true);
    try {
      await onAddFunds(amount);
      toast.success(`${currency} ${amount} added successfully`);
      setAmount(0);
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            My Wallet
          </CardTitle>
          {user && (user as User).admin_level && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Admin Wallet
            </span>
          )}
        </div>
        <CardDescription>Manage your funds and payment methods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground">Available Balance</div>
          <div className="text-3xl font-bold mt-1">
            {currency} {balance.toFixed(2)}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Add Funds</Label>
          <div className="flex space-x-2">
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            <Button 
              onClick={handleAddFunds}
              disabled={isLoading || amount <= 0}
              className="whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Funds
            </Button>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Payment Methods</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md"></div>
                <div>
                  <p className="text-sm font-medium">**** 4321</p>
                  <p className="text-xs text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Default
              </span>
            </div>
            
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              Add Payment Method
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
