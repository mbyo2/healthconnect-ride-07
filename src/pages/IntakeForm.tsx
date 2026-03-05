import { Header } from "@/components/Header";
import { DigitalIntakeForm } from "@/components/intake/DigitalIntakeForm";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useSearchParams, useNavigate } from "react-router-dom";

const IntakeFormPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointment') || undefined;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24 max-w-3xl">
          <DigitalIntakeForm 
            appointmentId={appointmentId} 
            onComplete={() => navigate('/appointments')} 
          />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default IntakeFormPage;
