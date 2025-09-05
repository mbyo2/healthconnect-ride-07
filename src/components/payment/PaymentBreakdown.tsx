import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface CommissionSettings {
  entity_type: string;
  commission_percentage: number;
}

interface PaymentBreakdownProps {
  amount: number;
  showDetailed?: boolean;
}

export const PaymentBreakdown = ({ amount, showDetailed = false }: PaymentBreakdownProps) => {
  const [commissions, setCommissions] = useState<CommissionSettings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommissions = async () => {
      const { data, error } = await supabase
        .from('commission_settings')
        .select('entity_type, commission_percentage')
        .eq('is_active', true);

      if (!error && data) {
        setCommissions(data);
      }
      setLoading(false);
    };

    fetchCommissions();
  }, []);

  const calculateBreakdown = () => {
    const breakdown: { [key: string]: { amount: number; percentage: number } } = {};
    
    commissions.forEach((commission) => {
      const commissionAmount = amount * (commission.commission_percentage / 100);
      breakdown[commission.entity_type] = {
        amount: commissionAmount,
        percentage: commission.commission_percentage
      };
    });

    return breakdown;
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'app_owner':
        return 'Platform Fee';
      case 'institution':
        return 'Institution Fee';
      case 'health_personnel':
        return 'Provider Fee';
      default:
        return entityType;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Breakdown</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const breakdown = calculateBreakdown();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Breakdown</CardTitle>
        <CardDescription>
          How your payment of {formatCurrency(amount)} will be distributed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b">
          <span className="font-medium">Total Amount</span>
          <Badge variant="secondary" className="text-base">
            {formatCurrency(amount)}
          </Badge>
        </div>
        
        {showDetailed && Object.entries(breakdown).map(([entityType, details]) => (
          <div key={entityType} className="flex justify-between items-center py-2">
            <div className="flex flex-col">
              <span className="text-sm">{getEntityLabel(entityType)}</span>
              <span className="text-xs text-muted-foreground">
                {details.percentage}% of total
              </span>
            </div>
            <span className="font-medium">
              {formatCurrency(details.amount)}
            </span>
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            This payment will be automatically distributed among the platform, 
            healthcare institution, and provider according to the commission structure.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};