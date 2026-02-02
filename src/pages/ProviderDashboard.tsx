import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { WaitlistManager } from "@/components/provider/WaitlistManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";
import { PatientRecords } from "@/components/provider/PatientRecords";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Bot, Brain, Sparkles, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const ProviderDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h1 className="text-3xl font-bold">Provider Dashboard</h1>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => navigate('/ai-diagnostics')}>
            <Bot className="mr-2 h-4 w-4" />
            AI Assistant
          </Button>
          <Link to="/pharmacy-inventory">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Pharmacy Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Clinical Decision Support Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-primary/20 flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Clinical Decision Support AI</h3>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Get AI-powered clinical insights, analyze patient symptoms, review medical images, and receive evidence-based recommendations for patient care.
              </p>
            </div>
            <Button onClick={() => navigate('/ai-diagnostics')} className="w-full sm:w-auto gap-2">
              Open AI Console
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleManager />
        </TabsContent>

        <TabsContent value="patients">
          <PatientRecords />
        </TabsContent>

        <TabsContent value="waitlist">
          <WaitlistManager />
        </TabsContent>

        <TabsContent value="signatures">
          <DigitalSignature />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderDashboard;
