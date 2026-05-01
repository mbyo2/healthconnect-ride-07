import { Header } from "@/components/Header";
import { InsuranceCardUpload } from "@/components/insurance/InsuranceCardUpload";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const InsuranceCardsPage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Insurance Cards</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upload and manage your insurance cards for faster check-in and accurate cost estimates.
            </p>
          </div>
          <InsuranceCardUpload />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default InsuranceCardsPage;
