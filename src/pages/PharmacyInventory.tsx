
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MedicationInventory } from '@/components/pharmacy/MedicationInventory';
import { InventoryTransactions } from '@/components/pharmacy/InventoryTransactions';
import SupplierManagement from '@/components/pharmacy/SupplierManagement';

const PharmacyInventory = () => {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Pharmacy Inventory Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Medication Inventory</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
        
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
