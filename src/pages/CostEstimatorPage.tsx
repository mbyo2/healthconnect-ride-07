import { Header } from "@/components/Header";
import { CostEstimator } from "@/components/insurance/CostEstimator";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const CostEstimatorPage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cost Estimator</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Estimate your out-of-pocket costs before booking, based on your insurance coverage.
            </p>
          </div>
          <CostEstimator />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default CostEstimatorPage;
