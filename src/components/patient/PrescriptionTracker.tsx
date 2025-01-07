import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrescriptionList } from "./PrescriptionList";
import { ReminderForm } from "./ReminderForm";

export const PrescriptionTracker = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="prescriptions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="reminders">Set Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <PrescriptionList />
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};