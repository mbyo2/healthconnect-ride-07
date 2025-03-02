
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsuranceForm } from "./InsuranceForm";
import { ChatWindow } from "../chat/ChatWindow";
import { EmergencyContacts } from "./EmergencyContacts";
import { PrescriptionTracker } from "./PrescriptionTracker";
import { SymptomsDiary } from "./SymptomsDiary";
import { HealthMetricsChart } from "./HealthMetricsChart";
import { MedicalHistory } from "./MedicalHistory";
import { AppointmentsList } from "./AppointmentsList";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarPlus } from "lucide-react";

export const PatientDashboard = () => {
  const [selectedTab, setSelectedTab] = useState("health");
  const navigate = useNavigate();

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
          <div className="grid gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Upcoming Appointments</h2>
              <Button 
                onClick={() => navigate("/search")} 
                className="flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                Book New Appointment
              </Button>
            </div>
            <AppointmentsList />
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
