import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, User, Loader2, Globe, Clock, Type, Palette, Settings as SettingsIcon } from "lucide-react";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsReminders, setSmsReminders] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  const { showSuccess } = useSuccessFeedback();
  const navigate = useNavigate();
  const { isEasyReadingEnabled, enableEasyReading, disableEasyReading } = useAccessibility();
  const [exporting, setExporting] = useState(false);

  const handleExportRequest = async () => {
    setExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to submit a data request.');
      const { error } = await supabase.from('data_subject_requests' as any).insert({
        user_id: user.id,
        request_type: 'export',
        metadata: { requested_from: 'settings_page' },
      });
      if (error) {
        if (error.code === '23505') {
          toast.info('An export request is already awaiting review.');
          return;
        }
        throw error;
      }
      toast.success('Data export requested — you will be notified when it is ready.');
    } catch (error: any) {
      toast.error(error.message || 'Unable to submit your request. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("show_in_search")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) setProfileVisibility((profile as any).show_in_search ?? true);

        const { data: tfa } = await supabase
          .from("user_two_factor" as any)
          .select("enabled")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tfa) setTwoFactor((tfa as any).enabled ?? false);

        const { data: notifSettings } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (notifSettings) {
          setNotifications(notifSettings.push_notifications ?? true);
          setEmailNotifications(notifSettings.email_notifications ?? true);
          setSmsReminders(notifSettings.appointment_reminders ?? false);
        }

        const { data: userSettings } = await supabase
          .from("user_settings" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

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

      await supabase.from("notification_settings").update({ push_notifications: checked }).eq("user_id", user.id);

      if (checked) {
        const success = await subscribeToNotifications();
        if (!success) { setNotifications(false); return; }
      } else {
        await unsubscribeFromNotifications();
      }

      showSuccess({ message: `Push notifications ${checked ? "enabled" : "disabled"}` });
    } catch (error) {
      toast.error("Failed to update notification settings");
    }
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailNotifications(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notification_settings").update({ email_notifications: checked }).eq("user_id", user.id);
      showSuccess({ message: `Email notifications ${checked ? "enabled" : "disabled"}` });
    } catch (error) {
      toast.error("Failed to update email settings");
    }
  };

  const handleSmsToggle = async (checked: boolean) => {
    setSmsReminders(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notification_settings").update({ appointment_reminders: checked }).eq("user_id", user.id);
      showSuccess({ message: `SMS reminders ${checked ? "enabled" : "disabled"}` });
    } catch (error) {
      toast.error("Failed to update SMS settings");
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    setProfileVisibility(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("profiles" as any).update({ show_in_search: checked }).eq("id", user.id);
      showSuccess({ message: `Profile visibility set to ${checked ? "public" : "private"}` });
    } catch (error) {
      toast.error("Failed to update profile visibility");
    }
  };

  const handleTwoFactorToggle = async () => {
    toast.info("Manage two-factor authentication from Privacy & Security.");
    navigate("/privacy-security");
  };

  const handleLanguageChange = async (value: string) => {
    setLanguage(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_settings" as any).update({ language: value }).eq("user_id", user.id);
      showSuccess({ message: `Language updated to ${value === "en" ? "English" : value === "fr" ? "French" : "Spanish"}` });
    } catch (error) {
      toast.error("Failed to update language");
    }
  };

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_settings" as any).update({ timezone: value }).eq("user_id", user.id);
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
      await supabase.from("user_settings" as any).update({ date_format: value }).eq("user_id", user.id);
      showSuccess({ message: `Date format updated to ${value}` });
    } catch (error) {
      toast.error("Failed to update date format");
    }
  };

  const handleAccessibilityToggle = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_settings" as any).update({ accessibility_mode: checked }).eq("user_id", user.id);
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
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-midnight font-sans transition-colors pb-16">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-canvas-silk dark:border-slate-800 px-4 sm:px-6 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-content mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
              System Preferences & Settings
              <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
            </h1>
            <p className="text-sm text-graphite-500 font-medium tracking-wide">
              Configure profile visibility, security, push notifications, and regional localization
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Column 1 */}
          <div className="space-y-6">
            {/* Account Settings */}
            <div className="vf-card space-y-4">
              <h2 className="font-medium text-base flex items-center gap-2 border-b border-canvas-silk pb-3">
                <User className="h-4 w-4 text-primary-500" /> Account Preferences
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-midnight">Directory Profile Visibility</p>
                  <p className="text-xs text-graphite-500">Visible to verified patient search & provider index</p>
                </div>
                <Switch checked={profileVisibility} onCheckedChange={handleVisibilityToggle} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk">
                <div>
                  <p className="font-medium text-sm text-midnight">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-graphite-500">TOTP authenticator app verification</p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={handleTwoFactorToggle} />
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="vf-card space-y-4">
              <h2 className="font-medium text-base flex items-center gap-2 border-b border-canvas-silk pb-3">
                <Palette className="h-4 w-4 text-accent-500" /> Theme & Accessibility
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-midnight">Dark / Light Interface Theme</p>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">Toggle dark mode styling</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">Accessibility Easy Reading</p>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">High-contrast text and enlarged touch targets</p>
                </div>
                <Switch checked={isEasyReadingEnabled} onCheckedChange={handleAccessibilityToggle} />
              </div>
            </div>

            {/* Privacy & Data */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
              <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-canvas-silk pb-3">
                <Shield className="h-4 w-4 text-success-500" /> Privacy & Data Rights
              </h2>
              <button
                onClick={handleExportRequest}
                disabled={exporting}
                className="w-full py-2.5 rounded-xl border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-800 dark:hover:bg-slate-700 text-left px-3 disabled:opacity-50 transition-all"
              >
                {exporting ? 'Submitting request…' : 'Request Export of All Personal Data'}
              </button>
              <button
                onClick={() => navigate("/privacy-security")}
                className="w-full py-2.5 rounded-xl border border-error-500/30 bg-error-500/5 font-bold text-xs text-error-500 hover:bg-error-500/10 text-left px-3"
              >
                Delete Account & Purge Records
              </button>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            {/* Notification Controls */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-canvas-silk pb-3">
                <Bell className="h-4 w-4 text-warning-500" /> Notification Telemetry
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">Browser Push Notifications</p>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">Instant alerts for messages, calls & lab updates</p>
                </div>
                <Switch checked={notifications} onCheckedChange={handleNotificationToggle} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">Email Broadcasts</p>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">Consultation receipts and appointment confirmations</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={handleEmailToggle} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">SMS Reminders</p>
                  <p className="text-[11px] text-graphite-500 dark:text-slate-400">Text reminders 1 hour prior to appointments</p>
                </div>
                <Switch checked={smsReminders} onCheckedChange={handleSmsToggle} />
              </div>
            </div>

            {/* Regional Localization */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-canvas-silk pb-3">
                <Globe className="h-4 w-4 text-primary-500" /> Regional Localization
              </h2>
              <div className="space-y-1.5">
                <label htmlFor="settings-language" className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Display Language</label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger id="settings-language" className="border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings-timezone" className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">System Timezone</label>
                <Select value={timezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger id="settings-timezone" className="border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="CAT">Central Africa Time (CAT / Lusaka)</SelectItem>
                    <SelectItem value="EST">Eastern Time</SelectItem>
                    <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings-date-format" className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Date Display Format</label>
                <Select value={dateFormat} onValueChange={handleDateFormatChange}>
                  <SelectTrigger id="settings-date-format" className="border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;