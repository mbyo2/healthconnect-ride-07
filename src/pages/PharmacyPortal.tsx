import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PharmacyDashboard } from '@/components/pharmacy/PharmacyDashboard';
import { PharmacyPOS } from '@/components/pharmacy/PharmacyPOS';
import { MedicationInventory } from '@/components/pharmacy/MedicationInventory';
import { PrescriptionFulfillment } from '@/components/pharmacy/PrescriptionFulfillment';
import SupplierManagement from '@/components/pharmacy/SupplierManagement';
import { PharmacyCustomers } from '@/components/pharmacy/PharmacyCustomers';
import { PharmacySalesReport } from '@/components/pharmacy/PharmacySalesReport';
import { PharmacyDeliveryTracking } from '@/components/pharmacy/PharmacyDeliveryTracking';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList, Truck,
  Users, BarChart3, Building2
} from 'lucide-react';

const PharmacyPortal = () => {
  const { user } = useAuth();
  const { institutionId: pharmacyId } = useInstitutionContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['pharmacy', 'pharmacist', 'institution_admin', 'admin']}>
        <div className="min-h-screen bg-[#f5f7fa] dark:bg-slate-950 py-8 px-4 sm:px-6 font-sans">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="rounded-3xl bg-[#0f172a] text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center font-black shadow-md">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00a86b] animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Pharmacy &amp; Logistics Hub</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Pharmacy Operations Portal</h1>
                  <p className="text-xs text-slate-400 font-medium">
                    POS billing, medication inventory, digital Rx fulfillment &amp; courier dispatch
                  </p>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <TabsTrigger value="dashboard" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </TabsTrigger>
                <TabsTrigger value="pos" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <ShoppingCart className="h-3.5 w-3.5" /> POS Billing
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Package className="h-3.5 w-3.5" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <ClipboardList className="h-3.5 w-3.5" /> Rx Fulfillment
                </TabsTrigger>
                <TabsTrigger value="deliveries" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Truck className="h-3.5 w-3.5" /> Deliveries
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Users className="h-3.5 w-3.5" /> Customers
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Building2 className="h-3.5 w-3.5" /> Suppliers
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-[#0073ea] data-[state=active]:text-white py-2 px-3.5 transition-all">
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
                  <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400 font-medium">
                    No pharmacy branch linked to this account
                  </div>
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
