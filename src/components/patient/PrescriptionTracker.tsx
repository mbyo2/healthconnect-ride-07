
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrescriptionList } from "./PrescriptionList";
import { ReminderForm } from "./ReminderForm";
import { PrescriptionStatus } from "./PrescriptionStatus";

export const PrescriptionTracker = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="prescriptions">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prescriptions">My Prescriptions</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <PrescriptionList />
        </TabsContent>

        <TabsContent value="status">
          <PrescriptionStatus />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};
