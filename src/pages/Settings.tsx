import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Shield,
  User,
  Loader2,
  Globe,
  Clock,
  Type,
  Palette,
  Monitor
} from "lucide-react";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAccessibility } from "@/context/AccessibilityContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsReminders, setSmsReminders] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // Regional Settings
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  const { showSuccess } = useSuccessFeedback();
  const navigate = useNavigate();
  const { isEasyReadingEnabled, enableEasyReading, disableEasyReading } = useAccessibility();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile settings
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('show_in_search')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfileVisibility((profile as any).show_in_search ?? true);
        }

        // Fetch 2FA settings
        const { data: tfa } = await supabase
          .from('user_two_factor' as any)
          .select('enabled')
          .eq('user_id', user.id)
          .single();

        if (tfa) {
          setTwoFactor((tfa as any).enabled ?? false);
        }

        // Fetch notification settings
        const { data: notifSettings } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (notifSettings) {
          setNotifications(notifSettings.push_notifications ?? true);
          setEmailNotifications(notifSettings.email_notifications ?? true);
          setSmsReminders(notifSettings.appointment_reminders ?? false);
        }

        // Fetch regional settings from user_settings
        const { data: userSettings } = await supabase
          .from('user_settings' as any)
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userSettings) {
          setLanguage((userSettings as any).language || "en");
          setTimezone((userSettings as any).timezone || "UTC");
          setDateFormat((userSettings as any).date_format || "MM/DD/YYYY");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [enableEasyReading, disableEasyReading]);

  const handleNotificationToggle = async (checked: boolean) => {
    setNotifications(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notification_settings')
        .update({ push_notifications: checked })
        .eq('user_id', user.id);

      if (checked) {
        const success = await subscribeToNotifications();
        if (!success) {
          setNotifications(false);
          return;
        }
      } else {
        await unsubscribeFromNotifications();
      }

      showSuccess({ message: `Push notifications ${checked ? 'enabled' : 'disabled'}` });
    } catch (error) {
      toast.error("Failed to update notification settings");
    }
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailNotifications(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notification_settings')
        .update({ email_notifications: checked })
        .eq('user_id', user.id);

      showSuccess({ message: `Email notifications ${checked ? 'enabled' : 'disabled'}` });
    } catch (error) {
      toast.error("Failed to update email settings");
    }
  };

  const handleSmsToggle = async (checked: boolean) => {
    setSmsReminders(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notification_settings')
        .update({ appointment_reminders: checked })
        .eq('user_id', user.id);

      showSuccess({ message: `SMS reminders ${checked ? 'enabled' : 'disabled'}` });
    } catch (error) {
      toast.error("Failed to update SMS settings");
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    setProfileVisibility(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles' as any)
        .update({ show_in_search: checked })
        .eq('id', user.id);

      showSuccess({ message: `Profile visibility set to ${checked ? 'public' : 'private'}` });
    } catch (error) {
      toast.error("Failed to update profile visibility");
    }
  };

  const handleTwoFactorToggle = async (checked: boolean) => {
    if (checked && !twoFactor) {
      toast.info("Redirecting to security settings to set up 2FA...");
      setTimeout(() => navigate("/privacy-security"), 1500);
      return;
    }

    setTwoFactor(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_two_factor' as any)
        .update({ enabled: checked })
        .eq('user_id', user.id);

      showSuccess({ message: `Two-factor authentication ${checked ? 'enabled' : 'disabled'}` });
    } catch (error) {
      toast.error("Failed to update 2FA settings");
    }
  };

  const handleLanguageChange = async (value: string) => {
    setLanguage(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings' as any)
        .update({ language: value })
        .eq('user_id', user.id);

      showSuccess({ message: `Language updated to ${value === 'en' ? 'English' : value === 'fr' ? 'French' : 'Spanish'}` });
    } catch (error) {
      toast.error("Failed to update language");
    }
  };

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings' as any)
        .update({ timezone: value })
        .eq('user_id', user.id);

      showSuccess({ message: `Timezone updated to ${value}` });
    } catch (error) {
      toast.error("Failed to update timezone");
    }
  };

  const handleDateFormatChange = async (value: string) => {
    setDateFormat(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings' as any)
        .update({ date_format: value })
        .eq('user_id', user.id);

      showSuccess({ message: `Date format updated to ${value}` });
    } catch (error) {
      toast.error("Failed to update date format");
    }
  };

  const handleAccessibilityToggle = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_settings' as any)
          .update({ accessibility_mode: checked })
          .eq('user_id', user.id);
      }

      if (checked) {
        enableEasyReading();
        showSuccess({ message: "Accessibility mode enabled" });
      } else {
        disableEasyReading();
        showSuccess({ message: "Accessibility mode disabled" });
      }
    } catch (error) {
      toast.error("Failed to update accessibility settings");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-trust-600 to-trust-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Customize your Doc' O Clock experience
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
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
                <Switch checked={profileVisibility} onCheckedChange={handleVisibilityToggle} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <div className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </div>
                </div>
                <Switch checked={twoFactor} onCheckedChange={handleTwoFactorToggle} />
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="border-trust-100 shadow-trust">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Theme</Label>
                  <div className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Accessibility Mode</Label>
                  <div className="text-sm text-muted-foreground">
                    Enable high contrast and larger touch targets
                  </div>
                </div>
                <Switch checked={isEasyReadingEnabled} onCheckedChange={handleAccessibilityToggle} />
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
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => toast.info("Data export request initiated. You will receive an email when it's ready.")}
              >
                Download My Data
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => navigate("/privacy-security")}
              >
                Delete Account
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/privacy")}
              >
                Privacy Policy
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/terms")}
              >
                Terms of Service
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
                <Switch checked={emailNotifications} onCheckedChange={handleEmailToggle} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Reminders</Label>
                  <div className="text-sm text-muted-foreground">
                    Receive appointment reminders via text
                  </div>
                </div>
                <Switch checked={smsReminders} onCheckedChange={handleSmsToggle} />
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card className="border-trust-100 shadow-trust">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Globe className="h-5 w-5" />
                Regional
              </CardTitle>
              <CardDescription>
                Manage your language and regional preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Language
                </Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Timezone
                </Label>
                <Select value={timezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="PST">Pacific Time</SelectItem>
                    <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" /> Date Format
                </Label>
                <Select value={dateFormat} onValueChange={handleDateFormatChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Date Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;