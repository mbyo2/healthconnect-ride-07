
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleManager } from "@/components/provider/ScheduleManager";
import { WaitlistManager } from "@/components/provider/WaitlistManager";
import { DigitalSignature } from "@/components/provider/DigitalSignature";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { Link } from "react-router-dom";

const ProviderDashboard = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Provider Dashboard</h1>
        
        <Link to="/pharmacy-inventory">
          <Button variant="outline" className="mt-4 md:mt-0">
            <Package className="mr-2 h-4 w-4" />
            Pharmacy Inventory
          </Button>
        </Link>
      </div>
      
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
