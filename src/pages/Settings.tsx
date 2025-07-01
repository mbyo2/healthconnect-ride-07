
import { useState } from "react";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Shield, User, Moon, Sun, Volume2, VolumeX, Smartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(theme === 'dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [biometrics, setBiometrics] = useState(false);

  const handleThemeToggle = (checked: boolean) => {
    setDarkMode(checked);
    setTheme(checked ? 'dark' : 'light');
    toast.success(`${checked ? 'Dark' : 'Light'} mode enabled`);
  };

  const handleNotificationToggle = (checked: boolean) => {
    setNotifications(checked);
    toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`);
  };

  return (
    <MobileLayout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-trust-600 to-trust-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Customize your Doc' O Clock experience
          </p>
        </div>

        {/* Appearance Settings */}
        <Card className="border-trust-100 shadow-trust">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-trust-700">
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks and feels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex items-center gap-2">
                Dark Mode
              </Label>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-trust-100 shadow-trust">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-trust-700">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Push Notifications</Label>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={handleNotificationToggle}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="sound" className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sound Effects
              </Label>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-trust-100 shadow-trust">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-trust-700">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>
              Keep your account safe and secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="biometrics" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Biometric Login
              </Label>
              <Switch
                id="biometrics"
                checked={biometrics}
                onCheckedChange={setBiometrics}
              />
            </div>
            <Separator />
            <Button variant="outline" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="border-trust-100 shadow-trust">
          <CardHeader>
            <CardTitle className="text-trust-700">Support</CardTitle>
            <CardDescription>
              Get help when you need it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              Help Center
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Contact Support
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
    </MobileLayout>
  );
};

export default Settings;
