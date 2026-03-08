import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PharmacyDashboard } from '@/components/pharmacy/PharmacyDashboard';
import { PharmacyPOS } from '@/components/pharmacy/PharmacyPOS';
import { MedicationInventory } from '@/components/pharmacy/MedicationInventory';
import { PrescriptionFulfillment } from '@/components/pharmacy/PrescriptionFulfillment';
import { SupplierManagement } from '@/components/pharmacy/SupplierManagement';
import { PharmacyCustomers } from '@/components/pharmacy/PharmacyCustomers';
import { PharmacySalesReport } from '@/components/pharmacy/PharmacySalesReport';
import { PharmacyDeliveryTracking } from '@/components/pharmacy/PharmacyDeliveryTracking';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList, Truck,
  Users, BarChart3, Building2
} from 'lucide-react';

const PharmacyPortal = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: pharmacyId } = useQuery({
    queryKey: ['pharmacy-institution', user?.id],
    queryFn: async () => {
      // Check institution_staff first
      const { data: staffData } = await supabase.from('institution_staff').select('institution_id')
        .eq('provider_id', user!.id).eq('is_active', true).maybeSingle();
      if (staffData?.institution_id) return staffData.institution_id;

      // Check if user is institution admin
      const { data: instData } = await supabase.from('healthcare_institutions').select('id')
        .eq('admin_id', user!.id).maybeSingle();
      return instData?.id || null;
    },
    enabled: !!user,
  });

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['pharmacy', 'pharmacist', 'institution_admin', 'admin']}>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto py-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Pharmacy Portal</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="pos" className="gap-1.5 text-xs sm:text-sm">
                  <ShoppingCart className="h-3.5 w-3.5" /> POS
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm">
                  <Package className="h-3.5 w-3.5" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="gap-1.5 text-xs sm:text-sm">
                  <ClipboardList className="h-3.5 w-3.5" /> Rx Fulfillment
                </TabsTrigger>
                <TabsTrigger value="deliveries" className="gap-1.5 text-xs sm:text-sm">
                  <Truck className="h-3.5 w-3.5" /> Deliveries
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-1.5 text-xs sm:text-sm">
                  <Users className="h-3.5 w-3.5" /> Customers
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="gap-1.5 text-xs sm:text-sm">
                  <Building2 className="h-3.5 w-3.5" /> Suppliers
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5" /> Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard"><PharmacyDashboard /></TabsContent>
              <TabsContent value="pos"><PharmacyPOS /></TabsContent>
              <TabsContent value="inventory"><MedicationInventory /></TabsContent>
              <TabsContent value="prescriptions"><PrescriptionFulfillment /></TabsContent>
              <TabsContent value="deliveries">
                {pharmacyId ? (
                  <PharmacyDeliveryTracking pharmacyId={pharmacyId} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No pharmacy linked to your account</p>
                )}
              </TabsContent>
              <TabsContent value="customers"><PharmacyCustomers /></TabsContent>
              <TabsContent value="suppliers"><SupplierManagement /></TabsContent>
              <TabsContent value="reports"><PharmacySalesReport /></TabsContent>
            </Tabs>
          </div>
        </div>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
};

export default PharmacyPortal;
