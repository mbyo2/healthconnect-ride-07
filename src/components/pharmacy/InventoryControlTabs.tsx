import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchInventory } from "@/components/pharmacy/BatchInventory";
import { ExpiryRadar } from "@/components/pharmacy/ExpiryRadar";
import { QualityControl } from "@/components/pharmacy/QualityControl";
import { StockAudit } from "@/components/pharmacy/StockAudit";
import { WriteOffs } from "@/components/pharmacy/WriteOffs";
import { StockValuation } from "@/components/pharmacy/StockValuation";

/**
 * Shared inventory-control sub-tabs: batch register, expiry radar, QA,
 * physical stock audits, write-offs, and valuation. Rendered inside both
 * /pharmacy-management and the pharmacist's /pharmacy-portal so the full
 * stock-control workflow is reachable wherever pharmacy staff work.
 */
export function InventoryControlTabs() {
  return (
    <Tabs defaultValue="batches" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start sm:w-auto">
        <TabsTrigger value="batches">Batches</TabsTrigger>
        <TabsTrigger value="expiry">Expiry Radar</TabsTrigger>
        <TabsTrigger value="quality">Quality</TabsTrigger>
        <TabsTrigger value="audits">Audits</TabsTrigger>
        <TabsTrigger value="writeoffs">Write-offs</TabsTrigger>
        <TabsTrigger value="valuation">Valuation</TabsTrigger>
      </TabsList>
      <TabsContent value="batches"><BatchInventory /></TabsContent>
      <TabsContent value="expiry"><ExpiryRadar /></TabsContent>
      <TabsContent value="quality"><QualityControl /></TabsContent>
      <TabsContent value="audits"><StockAudit /></TabsContent>
      <TabsContent value="writeoffs"><WriteOffs /></TabsContent>
      <TabsContent value="valuation"><StockValuation /></TabsContent>
    </Tabs>
  );
}
