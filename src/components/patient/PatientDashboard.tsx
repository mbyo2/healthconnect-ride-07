import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceForm } from "./InsuranceForm";
import { ChatWindow } from "../chat/ChatWindow";
import { EmergencyContacts } from "./EmergencyContacts";
import { PrescriptionTracker } from "./PrescriptionTracker";
import { SymptomsDiary } from "./SymptomsDiary";
import { HealthMetricsChart } from "./HealthMetricsChart";

export const PatientDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("health");

  return (
    <div className="container mx-auto py-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="health">Health Metrics</TabsTrigger>
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="health">
          <HealthMetricsChart />
        </TabsContent>
        <TabsContent value="symptoms">
          <SymptomsDiary />
        </TabsContent>
        <TabsContent value="insurance">
          <InsuranceForm />
        </TabsContent>
        <TabsContent value="chat">
          <ChatWindow providerId="provider-id" />
        </TabsContent>
        <TabsContent value="emergency">
          <EmergencyContacts />
        </TabsContent>
        <TabsContent value="prescriptions">
          <PrescriptionTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
};