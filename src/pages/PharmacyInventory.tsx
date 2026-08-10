import { MedicationInventory } from "@/components/pharmacy/MedicationInventory";
import { Header } from "@/components/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Package } from "lucide-react";

const PharmacyInventoryPage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-7xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Pharmacy & Medical Inventory</h1>
              <p className="text-muted-foreground text-sm">
                Add medications, manage stock levels, track batch numbers, and monitor expiration dates.
              </p>
            </div>
          </div>
          
          <MedicationInventory />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default PharmacyInventoryPage;
