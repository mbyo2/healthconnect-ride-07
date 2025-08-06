
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceForm } from "./InsuranceForm";
import { ChatWindow } from "../chat/ChatWindow";
import { EmergencyContacts } from "./EmergencyContacts";
import { PrescriptionTracker } from "./PrescriptionTracker";
import { SymptomsDiary } from "./SymptomsDiary";
import { HealthMetricsChart } from "./HealthMetricsChart";
import { MedicalHistory } from "./MedicalHistory";
import { AppointmentsList } from "./AppointmentsList";
import { ComprehensiveMedicalRecords } from "./ComprehensiveMedicalRecords";
import { ComprehensivePrescriptions } from "./ComprehensivePrescriptions";
import { InsuranceVerificationSystem } from "./InsuranceVerificationSystem";
import { EmergencyProtocols } from "./EmergencyProtocols";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Menu, Mic } from "lucide-react";
import { usePerformanceMonitoring } from "@/hooks/use-performance-monitoring";
import { LoadingScreen } from "../LoadingScreen";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { toast } from "sonner";
import { VoiceCommandButton } from "../VoiceCommandButton";

export const PatientDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("health");
  const [isLoading, setIsLoading] = useState(true);
  const { metrics, recordRouteChange } = usePerformanceMonitoring();
  const navigate = useNavigate();
  const { isOnline, offlineFeatures } = useOfflineMode();

  // Simulate loading to show a cleaner loading experience
  useEffect(() => {
    // Record performance metrics for the dashboard
    recordRouteChange("/dashboard");
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [recordRouteChange]);

  // Show warning for unavailable features when offline
  useEffect(() => {
    if (!isOnline) {
      toast.info("Some features are limited while offline", {
        description: "You'll still have access to your key health information",
        duration: 5000,
      });
    }
  }, [isOnline]);

  // Simplified view for very sick patients or slow connections
  const isSimplifiedMode = metrics.networkSpeed === 'slow' || localStorage.getItem('simplifiedMode') === 'true';

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto py-6">
      {/* Patient-friendly header with large buttons and simplified navigation */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Your Health Dashboard</h1>
        
        <div className="flex gap-3">
          {/* Voice command button for easier use by sick patients */}
          <VoiceCommandButton />
          
          {/* Simplified mode toggle */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const current = localStorage.getItem('simplifiedMode') === 'true';
              localStorage.setItem('simplifiedMode', (!current).toString());
              window.location.reload();
            }}
          >
            {isSimplifiedMode ? "Standard View" : "Simplified View"}
          </Button>
        </div>
      </div>

      {!isOnline && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
          <p className="font-medium">You're currently offline</p>
          <p className="text-sm">Some features may be limited, but you can still access your key health information</p>
        </div>
      )}

      {isSimplifiedMode ? (
        // Simplified tab interface for sick patients - larger buttons, fewer options
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => navigate("/medications")} 
              className="h-24 text-lg flex flex-col items-center justify-center"
              variant="outline"
            >
              <span className="text-2xl mb-2">💊</span>
              Medications
            </Button>
            <Button 
              onClick={() => navigate("/appointments")} 
              className="h-24 text-lg flex flex-col items-center justify-center"
              variant="outline"
            >
              <span className="text-2xl mb-2">📅</span>
              Appointments
            </Button>
            <Button 
              onClick={() => setSelectedTab("emergency")} 
              className="h-24 text-lg flex flex-col items-center justify-center"
              variant="outline"
            >
              <span className="text-2xl mb-2">🚨</span>
              Emergency
            </Button>
            <Button 
              onClick={() => setSelectedTab("health")} 
              className="h-24 text-lg flex flex-col items-center justify-center"
              variant="outline"
            >
              <span className="text-2xl mb-2">📊</span>
              Health
            </Button>
          </div>
          
          {selectedTab === "emergency" ? (
            <EmergencyContacts />
          ) : selectedTab === "health" ? (
            <HealthMetricsChart />
          ) : null}
        </div>
      ) : (
        // Standard tabs interface
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="health">Health Metrics</TabsTrigger>
            <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="records">Records</TabsTrigger>
          </TabsList>
          
          <TabsContent value="health">
            <HealthMetricsChart />
          </TabsContent>
          <TabsContent value="symptoms">
            <SymptomsDiary />
          </TabsContent>
          <TabsContent value="appointments">
            <div className="grid gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Upcoming Appointments</h2>
                <Button 
                  onClick={() => navigate("/search")} 
                  className="flex items-center gap-2"
                  disabled={!isOnline && !offlineFeatures.appointments}
                >
                  <CalendarPlus className="w-4 h-4" />
                  Book New Appointment
                </Button>
              </div>
              <AppointmentsList />
            </div>
          </TabsContent>
          <TabsContent value="medications">
            <div className="space-y-6">
              <ComprehensivePrescriptions />
              <PrescriptionTracker />
            </div>
          </TabsContent>
          <TabsContent value="insurance">
            <div className="space-y-6">
              <InsuranceVerificationSystem />
              <InsuranceForm />
            </div>
          </TabsContent>
          <TabsContent value="emergency">
            <div className="space-y-6">
              <EmergencyProtocols />
              <EmergencyContacts />
            </div>
          </TabsContent>
          <TabsContent value="records">
            <div className="space-y-6">
              <ComprehensiveMedicalRecords />
              <MedicalHistory />
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Quick action floating button for easy access */}
      <div className="fixed bottom-6 right-6">
        <Button 
          size="lg" 
          className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
          onClick={() => navigate("/emergency")}
        >
          SOS
        </Button>
      </div>
    </div>
  );
};
