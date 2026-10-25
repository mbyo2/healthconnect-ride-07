import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, User, Loader2, Globe, Clock, Type, Palette, Settings as SettingsIcon } from "lucide-react";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/i18n/LanguageContext";
import { subscribeToNotifications, unsubscribeFromNotifications } from "@/utils/notification-service";

/**
 * Real push state of THIS device/browser — deliberately not the saved
 * account preference. A preference row saying "on" means nothing if this
 * browser never granted permission or holds no push subscription, which
 * is exactly the gap the 2026-10-20 audit found (switch showed enabled
 * for users who could never receive a push).
 */
type PushUiState = "checking" | "enabled" | "disabled" | "blocked" | "unsupported";

async function detectPushState(): Promise<PushUiState> {
  // Native shells have no Web Push (FCM/APNs plugin not integrated) — the
  // subscribe service says the same, so report it honestly as unsupported.
  if (Capacitor.isNativePlatform()) return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    return subscription ? "enabled" : "disabled";
  } catch {
    return "disabled";
  }
}

const Settings = () => {
  const { language: i18nLang, setLanguage: setI18nLang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [pushState, setPushState] = useState<PushUiState>("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingOptOut, setMarketingOptOut] = useState(false);
  const [smsReminders, setSmsReminders] = useState(false);
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
          // Push switch state is NOT seeded from this preference row — it
          // is driven by the real device subscription (see refreshPushState).
          setEmailNotifications(notifSettings.email_notifications ?? true);
          setSmsReminders(notifSettings.appointment_reminders ?? false);
        }

        // SMS/WhatsApp prefs (canonical store for the reminder system)
        const { data: smsPrefs } = await supabase
          .from("notification_preferences")
          .select("sms_enabled")
          .eq("patient_id", user.id)
          .maybeSingle();
        if (smsPrefs) setSmsReminders((smsPrefs as any).sms_enabled ?? true);

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

        const { data: profile } = await (supabase.from("profiles" as any) as any)
          .select("email_marketing_opt_out")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) setMarketingOptOut(profile.email_marketing_opt_out ?? false);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [enableEasyReading, disableEasyReading]);

  // Checked upserts: .update() silently no-ops for users with no row yet,
  // so preferences use upsert on user_id and every write checks { error }.
  const upsertNotificationSettings = async (userId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) throw error;
  };

  const upsertUserSettings = async (userId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from("user_settings" as any)
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
    if (error) throw error;
  };

  // Read the device's actual push subscription and mirror it in the UI.
  const refreshPushState = useCallback(async () => {
    const state = await detectPushState();
    setPushState(state);
    setNotifications(state === "enabled");
  }, []);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  const handleNotificationToggle = async (checked: boolean) => {
    setPushBusy(true);
    try {
      if (checked) {
        // Subscribe FIRST; only persist the preference once the device
        // really holds a subscription.
        const success = await subscribeToNotifications();
        if (!success) {
          await refreshPushState();
          return;
        }
      } else {
        await unsubscribeFromNotifications();
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await upsertNotificationSettings(user.id, { push_notifications: checked });
      }

      await refreshPushState();
      showSuccess({ message: `Push notifications ${checked ? "enabled" : "disabled"}` });
    } catch (error) {
      toast.error("Failed to update notification settings");
      await refreshPushState();
    } finally {
      setPushBusy(false);
    }
  };

  const handleEmailToggle = async (checked: boolean) => {
    setEmailNotifications(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await upsertNotificationSettings(user.id, { email_notifications: checked });
      showSuccess({ message: `Email notifications ${checked ? "enabled" : "disabled"}` });
    } catch (error) {
      toast.error("Failed to update email settings");
    }
  };

  const handleMarketingToggle = async (checked: boolean) => {
    // checked = user wants marketing emails; opt_out is the inverse
    setMarketingOptOut(!checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await (supabase.from("profiles" as any) as any)
        .update({ email_marketing_opt_out: !checked })
        .eq("id", user.id);
      if (error) throw error;
      showSuccess({ message: checked ? "Marketing emails enabled" : "You won't receive marketing emails" });
    } catch (error) {
      toast.error("Failed to update marketing preferences");
      setMarketingOptOut(checked);
    }
  };

  const handleSmsToggle = async (checked: boolean) => {
    // Persist to notification_preferences (SMS/WhatsApp reminder backend).
    setSmsReminders(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            patient_id: user.id,
            sms_enabled: checked,
            appointment_reminders: checked,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "patient_id" }
        );
      if (error) throw error;
      toast.success(checked ? "SMS reminders on" : "SMS reminders off");
    } catch {
      toast.error("Failed to update SMS reminder preference");
      setSmsReminders(!checked);
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
      await upsertUserSettings(user.id, { language: value });
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
      await upsertUserSettings(user.id, { timezone: value });
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
      await upsertUserSettings(user.id, { date_format: value });
      showSuccess({ message: `Date format updated to ${value}` });
    } catch (error) {
      toast.error("Failed to update date format");
    }
  };

  // Easy Reading persists through the AccessibilityContext — the SAME
  // single persistence path the floating Accessibility menu uses
  // (enable/disableEasyReading -> per-account record `a11y.v2.<user-id>`,
  // mirrored to the user's `user_settings` row). One write path only:
  // this handler previously awaited a divergent upsert into
  // `user_settings.accessibility_mode` BEFORE touching the context, and
  // when that write threw (the table was phantom, PGRST205, proven
  // 2026-10-25), the toggle always failed in Settings while the menu
  // path worked.
  const handleAccessibilityToggle = (checked: boolean) => {
    if (checked) {
      enableEasyReading();
      showSuccess({ message: "Accessibility mode enabled" });
    } else {
      disableEasyReading();
      showSuccess({ message: "Accessibility mode disabled" });
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
      <div className="doc-page-header px-4 sm:px-6 py-5 shadow-sm">
        <div className="max-w-content mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-button">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight flex items-center gap-2">
              Settings
              <span className="w-2 h-2 rounded-full bg-success-500 animate-ping" />
            </h1>
            <p className="text-sm text-graphite-600 dark:text-slate-300 font-medium tracking-wide">
              Your account, security, notifications, and region
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm text-midnight">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-graphite-500">Extra security with an authenticator app</p>
                </div>
                <button
                  onClick={handleTwoFactorToggle}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-graphite-300 dark:border-slate-700 text-xs font-extrabold hover:bg-canvas dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  Manage · {twoFactor ? 'On' : 'Off'}
                </button>
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
                  <p className="text-xs text-graphite-600 dark:text-slate-300">Toggle dark mode styling</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">Accessibility Easy Reading</p>
                  <p className="text-xs text-graphite-600 dark:text-slate-300">Wider spacing and enlarged touch targets, saved to your account</p>
                </div>
                <Switch checked={isEasyReadingEnabled} onCheckedChange={handleAccessibilityToggle} aria-label="Accessibility easy reading"  className="scale-125" />
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
                className="w-full py-2.5 min-h-[44px] rounded-xl border border-graphite-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 hover:bg-canvas-mist dark:hover:bg-slate-700 text-left px-3 disabled:opacity-50 transition-all"
              >
                {exporting ? 'Submitting request…' : 'Request Export of All Personal Data'}
              </button>
              <button
                onClick={() => navigate("/privacy-security")}
                className="w-full py-2.5 min-h-[44px] rounded-xl border border-error-500/30 bg-error-500/5 font-bold text-xs text-error-500 hover:bg-error-500/10 text-left px-3"
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
                <Bell className="h-4 w-4 text-warning-500" /> Notifications
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs">Browser Push Notifications</p>
                  <p className="text-xs text-graphite-600 dark:text-slate-300">Instant alerts for messages, calls & lab updates</p>
                  <p className="text-xs mt-1 font-semibold" role="status">
                    {pushState === "checking" && <span className="text-graphite-500 dark:text-slate-400">Checking this device…</span>}
                    {pushState === "enabled" && <span className="text-success-600 dark:text-success-400">Enabled on this device</span>}
                    {pushState === "disabled" && <span className="text-graphite-500 dark:text-slate-400">Not enabled on this device — switch on to receive push alerts here</span>}
                    {pushState === "blocked" && <span className="text-error-500">Blocked in your browser settings — allow notifications for this site, then switch on</span>}
                    {pushState === "unsupported" && <span className="text-graphite-500 dark:text-slate-400">Not supported in this browser/app — in-app, WhatsApp and SMS alerts still work</span>}
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={handleNotificationToggle}
                  disabled={pushBusy || pushState === "checking" || pushState === "blocked" || pushState === "unsupported"}
                  aria-label="Browser push notifications"
                  className="scale-125 shrink-0"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">Email Broadcasts</p>
                  <p className="text-xs text-graphite-600 dark:text-slate-300">Consultation receipts and appointment confirmations</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={handleEmailToggle} aria-label="Email broadcasts"  className="scale-125" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div>
                  <p className="font-bold text-xs">Health campaigns & tips</p>
                  <p className="text-xs text-graphite-600 dark:text-slate-300">Screening reminders and health tips from your facility</p>
                </div>
                <Switch checked={!marketingOptOut} onCheckedChange={handleMarketingToggle} aria-label="Health campaigns and tips" className="scale-125" />
              </div>
              <div className="pt-2 border-t border-canvas-silk dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs">SMS &amp; WhatsApp Reminders</p>
                    <p className="text-xs text-graphite-600 dark:text-slate-300">Appointment, lab-result and refill reminders by text — works on any phone</p>
                  </div>
                  <Switch checked={smsReminders} onCheckedChange={handleSmsToggle} aria-label="SMS and WhatsApp reminders" className="scale-125" />
                </div>
                {smsReminders && (
                  <p className="text-xs text-graphite-500 dark:text-slate-400 mt-2">
                    Manage channels, timing and your reminder phone number in{" "}
                    <button
                      onClick={() => navigate("/health-records")}
                      className="font-bold text-primary-600 dark:text-primary-400 underline underline-offset-2"
                    >
                      Health Records → Notifications
                    </button>
                    .
                  </p>
                )}
              </div>
            </div>

            {/* Regional Localization */}
            <div className="rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <h2 className="font-extrabold text-sm flex items-center gap-2 border-b border-canvas-silk pb-3">
                <Globe className="h-4 w-4 text-primary-500" /> Language & Region
              </h2>
              <div className="space-y-1.5">
                <label htmlFor="settings-language" className="text-xs font-extrabold text-graphite-500 dark:text-slate-400 uppercase">Display Language</label>
                <Select value={i18nLang} onValueChange={(val) => {
                  setI18nLang(val as any);
                  setLanguage(val);
                  showSuccess({ message: `Language updated` });
                }}>
                  <SelectTrigger id="settings-language" className="border-graphite-300 dark:border-slate-700 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.nativeName}</SelectItem>
                    ))}
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