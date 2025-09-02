
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, History, TrendingUp } from 'lucide-react';
import { getWalletBalance, addFundsToWallet } from '@/services/payment';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export function WalletCard() {
  const { session, user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFunds, setAddingFunds] = useState(false);

  const fetchWalletData = async () => {
    if (!user?.id) return;

    try {
      const currentBalance = await getWalletBalance();
      setBalance(currentBalance);

      if (session) {
        const { data: transactionData, error } = await supabase
          .from('wallet_transactions')
          .select(`
            id,
            transaction_type,
            amount,
            balance_after,
            description,
            created_at
          `)
          .eq('created_by', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching transactions:', error);
        } else {
          setTransactions(transactionData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [session, user]);

  const handleAddFunds = async (amount: number) => {
    if (!user?.id) {
      toast.error('You must be logged in to add funds');
      return;
    }

    setAddingFunds(true);
    try {
      await addFundsToWallet(user.id, amount);
      await fetchWalletData(); // Refresh the data
      toast.success(`$${amount} added to your wallet`);
    } catch (error) {
      console.error('Error adding funds:', error);
      toast.error('Failed to add funds');
    } finally {
      setAddingFunds(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full bg-gradient-to-br from-trust-600 to-trust-700 text-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="h-6 w-6" />
              <CardTitle className="text-xl">My Wallet</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Active
            </Badge>
          </div>
          <CardDescription className="text-trust-100">
            Your healthcare payment wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <p className="text-trust-200 text-sm">Available Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => handleAddFunds(25)}
                disabled={addingFunds}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add $25
              </Button>
              <Button 
                onClick={() => handleAddFunds(50)}
                disabled={addingFunds}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add $50
              </Button>
              <Button 
                onClick={() => handleAddFunds(100)}
                disabled={addingFunds}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add $100
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5 text-trust-600" />
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </div>
            <TrendingUp className="h-5 w-5 text-trust-600" />
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No transactions yet. Start by adding funds to your wallet!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {transaction.description || `${transaction.transaction_type} transaction`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transaction_type === 'credit' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'credit' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Balance: {formatCurrency(transaction.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
