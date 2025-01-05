import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityManager } from "@/components/provider/AvailabilityManager";
import { PatientRecords } from "@/components/provider/PatientRecords";
import { PrescriptionWriter } from "@/components/provider/PrescriptionWriter";
import { ScheduleManager } from "@/components/provider/ScheduleManager";

const ProviderDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Provider Dashboard</h1>
      
      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="records">Patient Records</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <ScheduleManager />
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager />
        </TabsContent>

        <TabsContent value="records">
          <PatientRecords />
        </TabsContent>

        <TabsContent value="prescriptions">
          <PrescriptionWriter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProviderDashboard;