
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Pill, AlertCircle, Package, TrendingDown } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/context/AuthContext";

interface InventorySummary {
  totalItems: number;
  lowStock: number;
  expiringSoon: number;
}

interface MedicationTransaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  quantity: number;
  medication_inventory: {
    medication_name: string;
    dosage: string;
  };
}

export const PharmacyDashboard = () => {
  const { user } = useAuth();
  
  // Get institution id for the current user
  const { data: userInstitution, isLoading: loadingInstitution } = useQuery({
    queryKey: ['userInstitution', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('institution_staff')
        .select('institution_id')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching institution:', error);
        return null;
      }
      
      return data?.institution_id;
    },
  });

  const { data: inventorySummary, isLoading: loadingInventory } = useQuery({
    queryKey: ["inventorySummary", userInstitution],
    queryFn: async () => {
      if (!userInstitution) return { totalItems: 0, lowStock: 0, expiringSoon: 0 };
      
      const { data, error } = await supabase
        .from("medication_inventory")
        .select("*")
        .eq("institution_id", userInstitution);

      if (error) {
        throw new Error(`Error fetching inventory: ${error.message}`);
      }
      
      const totalItems = data.length;
      const lowStock = data.filter(item => item.quantity_available <= item.minimum_stock_level).length;
      const expiringSoon = data.filter(item => {
        const expiryDate = new Date(item.expiry_date);
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
        return expiryDate < threeMonthsFromNow;
      }).length;
      
      return { totalItems, lowStock, expiringSoon };
    },
    enabled: !!userInstitution,
    initialData: { totalItems: 0, lowStock: 0, expiringSoon: 0 }
  });

  const { data: recentTransactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ["recentTransactions", userInstitution],
    queryFn: async () => {
      if (!userInstitution) return [];
      
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          medication_inventory (medication_name, dosage)
        `)
        .order('transaction_date', { ascending: false })
        .eq("medication_inventory.institution_id", userInstitution)
        .limit(5);

      if (error) {
        throw new Error(`Error fetching transactions: ${error.message}`);
      }
      
      return data as MedicationTransaction[];
    },
    enabled: !!userInstitution
  });

  if (loadingInventory || loadingTransactions || loadingInstitution) {
    return <LoadingScreen />;
  }

  if (!userInstitution) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-6 text-center">
            <div>
              <AlertCircle className="mx-auto h-10 w-10 text-orange-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Institution Association</h3>
              <p className="text-muted-foreground mb-4">
                You are not associated with any healthcare institution. 
                Please contact an administrator to associate your account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Medications</CardTitle>
            <Pill className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">Total unique medications in inventory</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary?.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">Items below minimum stock level</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary?.expiringSoon || 0}</div>
            <p className="text-xs text-muted-foreground">Medications expiring in next 3 months</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{transaction.medication_inventory?.medication_name} {transaction.medication_inventory?.dosage}</p>
                    <p className="text-sm text-muted-foreground capitalize">{transaction.transaction_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{transaction.quantity} units</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No recent transactions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
