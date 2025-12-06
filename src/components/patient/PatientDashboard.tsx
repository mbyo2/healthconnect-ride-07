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
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Menu, Mic, Bot, Sparkles, ArrowRight, Brain } from "lucide-react";
import { usePerformanceMonitoring } from "@/hooks/use-performance-monitoring";
import { safeLocalGet, safeLocalSet } from '@/utils/storage';
import { LoadingScreen } from "../LoadingScreen";
import { useOfflineMode } from "@/hooks/use-offline-mode";
import { toast } from "sonner";
import { VoiceCommandButton } from "../VoiceCommandButton";
import { AIInsightsWidget } from "../ai/AIInsightsWidget";

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
  const isSimplifiedMode = metrics.networkSpeed === 'slow' || safeLocalGet('simplifiedMode') === 'true';

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Patient-friendly header with large buttons and simplified navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Your Health Dashboard</h1>
        
        <div className="flex gap-3">
          {/* Voice command button for easier use by sick patients */}
          <VoiceCommandButton />
          
          {/* Simplified mode toggle */}
          <Button 
            variant="outline" 
            size="sm"
              onClick={() => {
              const current = safeLocalGet('simplifiedMode') === 'true';
              safeLocalSet('simplifiedMode', (!current).toString());
              window.location.reload();
            }}
          >
            {isSimplifiedMode ? "Standard View" : "Simplified View"}
          </Button>
        </div>
      </div>

      {/* AI Health Assistant Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Doc 0 Clock AI Assistant</h3>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Get instant health guidance, symptom analysis, and personalized recommendations 24/7.
              </p>
            </div>
            <Button onClick={() => navigate('/ai-diagnostics')} className="w-full sm:w-auto gap-2">
              <Bot className="h-4 w-4" />
              Chat with AI
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isOnline && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
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
              onClick={() => navigate("/ai-diagnostics")} 
              className="h-24 text-lg flex flex-col items-center justify-center border-primary/50"
              variant="outline"
            >
              <span className="text-2xl mb-2">🤖</span>
              AI Assistant
            </Button>
            <Button 
              onClick={() => setSelectedTab("emergency")} 
              className="h-24 text-lg flex flex-col items-center justify-center"
              variant="outline"
            >
              <span className="text-2xl mb-2">🚨</span>
              Emergency
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              AI
            </TabsTrigger>
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
          <TabsContent value="ai">
            <div className="space-y-6">
              <AIInsightsWidget context="health" />
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <Brain className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Full AI Health Assistant</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Chat with our AI, upload medical images for analysis, get symptom assessments, and receive personalized health recommendations.
                  </p>
                  <Button onClick={() => navigate('/ai-diagnostics')} size="lg" className="gap-2">
                    <Bot className="h-5 w-5" />
                    Open AI Chat
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
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
