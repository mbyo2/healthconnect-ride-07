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
import { InventoryControlTabs } from '@/components/pharmacy/InventoryControlTabs';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { useInstitutionContext } from '@/hooks/useInstitutionContext';
import { InstitutionSwitcher } from '@/components/institution/InstitutionSwitcher';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, ClipboardList, Truck,
  Users, BarChart3, Building2
} from 'lucide-react';

const PharmacyPortal = () => {
  const { user } = useAuth();
  const { hasRole, availableRoles } = useUserRoles();
  const { institutionId: pharmacyId, affiliations, switchInstitution } = useInstitutionContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Wholesale distributors (ZAMRA-licensed) are B2B-only: no retail POS,
  // no patient Rx dispensing, no walk-in customers. A user holding BOTH a
  // wholesale and a retail pharmacy role keeps the full retail surface.
  const isWholesaleOnly =
    hasRole(['wholesale_pharmacy']) &&
    !hasRole(['pharmacy', 'pharmacist', 'pharmacy_technologist']);
  // Portal title fits the visitor: individual pharmacists/technologists see
  // their own console, wholesale distributors the B2B portal.
  const portalTitle = isWholesaleOnly ? 'Wholesale Distribution Portal'
    : availableRoles.includes('pharmacist') ? 'Pharmacist Console'
    : availableRoles.includes('pharmacy_technologist') ? 'Pharmacy Technologist Console'
    : 'Pharmacy Operations Portal';
  const showRetailTabs = !isWholesaleOnly;

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['pharmacy', 'pharmacist', 'pharmacy_technologist', 'wholesale_pharmacy', 'institution_admin', 'institution_staff', 'inventory_manager', 'billing_staff', 'admin', 'super_admin']}>
        <div className="min-h-screen bg-canvas-bone dark:bg-slate-950 py-8 px-4 sm:px-6 font-sans">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Pharmacy &amp; Logistics Hub</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                    {portalTitle}
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">
                    {isWholesaleOnly
                      ? 'B2B medicine supply: warehouse inventory, batch traceability & supplier management'
                      : 'POS billing, medication inventory, digital Rx fulfillment & courier dispatch'}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <InstitutionSwitcher
                  affiliations={affiliations}
                  activeId={pharmacyId}
                  onSwitch={switchInstitution}
                />
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-canvas-silk dark:border-slate-800 shadow-xs">
                <TabsTrigger value="dashboard" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
                </TabsTrigger>
                {showRetailTabs && (
                  <TabsTrigger value="pos" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                    <ShoppingCart className="h-3.5 w-3.5" /> POS Billing
                  </TabsTrigger>
                )}
                <TabsTrigger value="inventory" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Package className="h-3.5 w-3.5" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="stock-control" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Boxes className="h-3.5 w-3.5" /> Stock Control
                </TabsTrigger>
                {showRetailTabs && (
                  <TabsTrigger value="prescriptions" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                    <ClipboardList className="h-3.5 w-3.5" /> Rx Fulfillment
                  </TabsTrigger>
                )}
                {showRetailTabs && (
                  <TabsTrigger value="deliveries" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                    <Truck className="h-3.5 w-3.5" /> Deliveries
                  </TabsTrigger>
                )}
                {showRetailTabs && (
                  <TabsTrigger value="customers" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                    <Users className="h-3.5 w-3.5" /> Customers
                  </TabsTrigger>
                )}
                <TabsTrigger value="suppliers" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <Building2 className="h-3.5 w-3.5" /> Suppliers
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-1.5 text-xs font-black rounded-xl data-[state=active]:bg-primary-500 data-[state=active]:text-white py-2 px-3.5 transition-all">
                  <BarChart3 className="h-3.5 w-3.5" /> Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard"><PharmacyDashboard /></TabsContent>
              {showRetailTabs && <TabsContent value="pos"><PharmacyPOS /></TabsContent>}
              <TabsContent value="inventory"><MedicationInventory /></TabsContent>
              <TabsContent value="stock-control"><InventoryControlTabs /></TabsContent>
              {showRetailTabs && <TabsContent value="prescriptions"><PrescriptionFulfillment /></TabsContent>}
              {showRetailTabs && (
                <TabsContent value="deliveries">
                  {pharmacyId ? (
                    <PharmacyDeliveryTracking pharmacyId={pharmacyId} />
                  ) : (
                    <div className="rounded-3xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400 font-medium">
                      No pharmacy branch linked to this account
                    </div>
                  )}
                </TabsContent>
              )}
              {showRetailTabs && <TabsContent value="customers"><PharmacyCustomers /></TabsContent>}
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
