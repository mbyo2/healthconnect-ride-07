import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Crown, TrendingUp, Settings, Download } from "lucide-react";

interface AppOwnerWalletData {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export const AppOwnerWalletCard = () => {
  const [walletData, setWalletData] = useState<AppOwnerWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('app_owner_wallet')
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setWalletData(data);
    } catch (error) {
      console.error('Error fetching app owner wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleWithdrawal = async () => {
    toast.info('Withdrawal feature coming soon');
  };

  const handleCommissionSettings = () => {
    toast.info('Commission settings feature coming soon');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-golden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-golden" />
            <CardTitle>Platform Revenue</CardTitle>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1 bg-golden/10 text-golden">
            <TrendingUp className="h-3 w-3" />
            Platform Owner
          </Badge>
        </div>
        <CardDescription>
          Total platform earnings from all transactions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center py-6 bg-gradient-to-br from-golden/5 to-golden/10 rounded-lg">
          <div className="text-4xl font-bold text-golden">
            {formatCurrency(walletData?.balance || 0)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total Platform Revenue
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleWithdrawal}
          >
            <Download className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleCommissionSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center mt-4">
          Last updated: {walletData?.updated_at ? 
            new Date(walletData.updated_at).toLocaleDateString() : 
            'Never'
          }
        </div>
      </CardContent>
    </Card>
  );
};