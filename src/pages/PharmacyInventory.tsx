
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MedicationInventory } from "@/components/pharmacy/MedicationInventory";
import { InventoryTransactions } from "@/components/pharmacy/InventoryTransactions";
import { SupplierManagement } from "@/components/pharmacy/SupplierManagement";
import { PharmacyDashboard } from "@/components/pharmacy/PharmacyDashboard";

const PharmacyInventory = () => {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Pharmacy Inventory Management</h1>
      
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <PharmacyDashboard />
        </TabsContent>
        
        <TabsContent value="inventory">
          <MedicationInventory />
        </TabsContent>
        
        <TabsContent value="transactions">
          <InventoryTransactions />
        </TabsContent>
        
        <TabsContent value="suppliers">
          <SupplierManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PharmacyInventory;
