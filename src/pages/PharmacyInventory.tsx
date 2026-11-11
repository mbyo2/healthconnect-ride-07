import { MedicationInventory } from "@/components/pharmacy/MedicationInventory";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Package } from "lucide-react";

const PharmacyInventoryPage = () => {
  return (
    <ProtectedRoute>
      <div>
        <main>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Pharmacy & medical inventory</h1>
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
