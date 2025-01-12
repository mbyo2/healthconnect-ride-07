import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { WaitlistManager } from "@/components/provider/WaitlistManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";

const ProviderDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Provider Dashboard</h1>
      
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="signatures">Digital Signatures</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleManager />
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