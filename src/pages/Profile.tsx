import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Settings, Bell, Shield, LogOut } from "lucide-react";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14 px-4">
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <h2 className="font-semibold">John Doe</h2>
              <p className="text-sm text-gray-500">john.doe@example.com</p>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {[
            { icon: Settings, label: "Settings" },
            { icon: Bell, label: "Notifications" },
            { icon: Shield, label: "Privacy" },
            { icon: LogOut, label: "Logout" }
          ].map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              className="w-full justify-start gap-2 h-12"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Profile;