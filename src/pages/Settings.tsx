import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, User, Moon, Sun, Volume2, VolumeX, Smartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { setTheme } = useTheme();
  const { showSuccess } = useSuccessFeedback();

  const handleThemeToggle = (checked: boolean) => {
    setDarkMode(checked);
    setTheme(checked ? 'dark' : 'light');
    showSuccess({ message: `${checked ? 'Dark' : 'Light'} mode enabled` });
  };

  const handleNotificationToggle = (checked: boolean) => {
    setNotifications(checked);
    showSuccess({ message: `Notifications ${checked ? 'enabled' : 'disabled'}` });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-trust-600 to-trust-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Customize your Doc' O Clock experience
        </p>
      </div>

      {/* Account Settings */}
      <Card className="border-trust-100 shadow-trust">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>
            Manage your account preferences and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Profile Visibility</Label>
              <div className="text-sm text-muted-foreground">
                Make your profile visible to healthcare providers
              </div>
            </div>
            <Switch checked={true} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Two-Factor Authentication</Label>
              <div className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </div>
            </div>
            <Switch checked={false} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="border-trust-100 shadow-trust">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Push Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive notifications about appointments and messages
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={handleNotificationToggle} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Get important updates via email
              </div>
            </div>
            <Switch checked={true} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">SMS Reminders</Label>
              <div className="text-sm text-muted-foreground">
                Receive appointment reminders via text
              </div>
            </div>
            <Switch checked={false} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="border-trust-100 shadow-trust">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Manage your privacy settings and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            Download My Data
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Delete Account
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Privacy Policy
          </Button>
          <Button variant="outline" className="w-full justify-start">
            Terms of Service
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;