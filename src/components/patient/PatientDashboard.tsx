import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceForm } from "./InsuranceForm";
import { ChatWindow } from "../chat/ChatWindow";
import { EmergencyContacts } from "./EmergencyContacts";
import { PrescriptionTracker } from "./PrescriptionTracker";
import { SymptomsDiary } from "./SymptomsDiary";
import { HealthMetricsChart } from "./HealthMetricsChart";
import { MedicalHistory } from "./MedicalHistory";

export const PatientDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("health");

  return (
    <div className="container mx-auto py-6">
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
          <div className="grid gap-4">
            <h2 className="text-2xl font-bold">Upcoming Appointments</h2>
            {/* Appointment scheduling component will be implemented next */}
            <p className="text-gray-500">No upcoming appointments</p>
          </div>
        </TabsContent>
        <TabsContent value="medications">
          <PrescriptionTracker />
        </TabsContent>
        <TabsContent value="insurance">
          <InsuranceForm />
        </TabsContent>
        <TabsContent value="emergency">
          <EmergencyContacts />
        </TabsContent>
        <TabsContent value="records">
          <MedicalHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};