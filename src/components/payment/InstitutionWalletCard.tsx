import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Wallet, TrendingUp, Download } from "lucide-react";

interface InstitutionWalletData {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

interface InstitutionWalletCardProps {
  institutionId: string;
}

export const InstitutionWalletCard = ({ institutionId }: InstitutionWalletCardProps) => {
  const [walletData, setWalletData] = useState<InstitutionWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchWalletData();
  }, [institutionId, user]);

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('institution_wallets')
        .select('*')
        .eq('institution_id', institutionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setWalletData(data);
    } catch (error) {
      console.error('Error fetching institution wallet:', error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Institution Wallet</CardTitle>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Active
          </Badge>
        </div>
        <CardDescription>
          Institution earnings and balance management
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center py-4">
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(walletData?.balance || 0)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Available Balance
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
            onClick={() => toast.info('Statements feature coming soon')}
          >
            Statements
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