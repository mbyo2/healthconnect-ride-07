import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceForm } from "./InsuranceForm";
import { ChatWindow } from "../chat/ChatWindow";
import { EmergencyContacts } from "./EmergencyContacts";
import { PrescriptionTracker } from "./PrescriptionTracker";

export const PatientDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("insurance");

  return (
    <div className="container mx-auto py-6">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        </TabsList>
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