import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Lock, Eye, EyeOff, KeyRound, AlertTriangle, FileText, Bell, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwoFactorMethod } from "@/types/settings";
import { Separator } from "@/components/ui/separator";

const PrivacySecurityPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("app");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Privacy settings
  const [shareMedicalData, setShareMedicalData] = useState(true);
  const [allowResearchUsage, setAllowResearchUsage] = useState(false);
  const [showInSearch, setShowInSearch] = useState(true);
  const [dataRetentionPeriod, setDataRetentionPeriod] = useState("365");

  useEffect(() => {
    const fetchSecuritySettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile settings
        const { data: profile, error } = await supabase
          .from('profiles' as any)
          .select('share_medical_data, allow_research_usage, show_in_search, data_retention_period')
          .eq('id', user.id)
          .single();

        if (profile) {
          setShareMedicalData((profile as any).share_medical_data ?? true);
          setAllowResearchUsage((profile as any).allow_research_usage ?? false);
          setShowInSearch((profile as any).show_in_search ?? true);
          setDataRetentionPeriod((profile as any).data_retention_period ?? "365");
        }

        // Fetch audit logs
        fetchAuditLogs();
      } catch (error) {
        console.error("Error fetching security settings:", error);
      }
    };

    fetchSecuritySettings();
  }, []);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchAuditLogs = async (limit = 5) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('audit_logs' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data) {
      setAuditLogs(data);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Log the password change action
        logSecurityAction("password_changed", "auth", "");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);

  const toggleTwoFactor = async () => {
    try {
      setIsLoading(true);
      const { setupTwoFactor, disableTwoFactor } = await import('@/utils/two-factor-service');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!isTwoFactorEnabled) {
        const setup = await setupTwoFactor(user.id);
        setQrCodeUrl(setup.qrCodeUrl);
        setManualEntryKey(setup.manualEntryKey);
        setBackupCodes(setup.backupCodes);
        setShowBackupCodes(true);
        setIsVerifying(true);
      } else {
        const code = window.prompt('Enter a current 6-digit code (or a backup code) to disable 2FA');
        if (!code) return;
        await disableTwoFactor(user.id, code.trim());
        setIsTwoFactorEnabled(false);
        setShowBackupCodes(false);
        setBackupCodes([]);
        setQrCodeUrl(null);
        setManualEntryKey(null);
        toast.success('Two-factor authentication disabled');
        logSecurityAction('2fa_disabled', 'auth', '');
      }
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      toast.error(error?.message || 'Error updating two-factor authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTwoFactorSetup = async () => {
    try {
      setIsLoading(true);
      const { enableTwoFactor } = await import('@/utils/two-factor-service');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await enableTwoFactor(user.id, verificationCode.trim());
      setIsTwoFactorEnabled(true);
      setIsVerifying(false);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled');
      logSecurityAction('2fa_enabled', 'auth', '');
    } catch (error: any) {
      toast.error(error?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };


  const updatePrivacySettings = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles' as any)
        .update({
          share_medical_data: shareMedicalData,
          allow_research_usage: allowResearchUsage,
          show_in_search: showInSearch,
          data_retention_period: dataRetentionPeriod
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Privacy settings updated");

      // Log the privacy settings update
      logSecurityAction("privacy_settings_updated", "privacy", "");
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      toast.error("Failed to update privacy settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Request deletion of your account? We will retain only data required by law until the request is reviewed."
    );

    if (confirmed) {
      await submitDataRequest('deletion');
    }
  };

  const submitDataRequest = async (requestType: 'export' | 'deletion') => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to submit a data request.');

      const { error } = await supabase.from('data_subject_requests' as any).insert({
        user_id: user.id,
        request_type: requestType,
        metadata: { requested_from: 'privacy_security_page' },
      });

      if (error) {
        if (error.code === '23505') {
          toast.info(`A ${requestType} request is already awaiting review.`);
          return;
        }
        throw error;
      }

      await logSecurityAction(`data_${requestType}_requested`, 'privacy', '');
      toast.success(
        requestType === 'export'
          ? 'Your data export request has been submitted.'
          : 'Your account deletion request has been submitted for review.',
      );
    } catch (error: any) {
      console.error(`Error submitting ${requestType} request:`, error);
      toast.error(error.message || 'Unable to submit your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logSecurityAction = async (action: string, resourceType: string, resourceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs' as any).insert({
        user_id: user.id,
        action,
        resource: resourceType,
        resource_id: resourceId,
        user_agent: navigator.userAgent,
        category: 'security',
        outcome: 'success',
        severity: 'info'
      });

      // Refresh logs
      fetchAuditLogs();
    } catch (error) {
      console.error("Error logging security action:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Privacy & Security</h1>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

            {isVerifying ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Setup your authenticator app using the codes provided and enter the verification code.
                </p>

                {showBackupCodes && (
                  <div className="mt-4">
                    <Label>Backup Codes</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {backupCodes.map((code, i) => (
                        <div key={i} className="bg-muted p-2 rounded text-center font-mono">
                          {code}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Save these codes in a secure place. You can use these if you lose access to your authenticator app.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    placeholder="000000"
                    className="font-mono tracking-wider"
                    maxLength={6}
                  />
                </div>

                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Button onClick={verifyTwoFactorSetup} disabled={verificationCode.length !== 6 || isLoading}>
                    {isLoading ? "Verifying..." : "Verify"}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsVerifying(false);
                    setShowBackupCodes(false);
                    setVerificationCode("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="h-5 w-5" />
                    <span>Enable Two-Factor Authentication</span>
                  </div>
                  <Switch
                    checked={isTwoFactorEnabled}
                    onCheckedChange={toggleTwoFactor}
                    disabled={isLoading}
                  />
                </div>

                {isTwoFactorEnabled && (
                  <div className="pt-2">
                    <Label htmlFor="2fa-method">Authentication Method</Label>
                    <Select
                      value={twoFactorMethod}
                      onValueChange={(value: TwoFactorMethod) => setTwoFactorMethod(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="2fa-method" className="mt-1">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="app">Authenticator App</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS (Text Message)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Protect your account with an additional layer of security by requiring a one-time code when you sign in.
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Security Audit Log</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              We keep track of important security-related actions on your account.
              This helps us protect your account and respond to any potential security incidents.
            </p>

            <ul className="space-y-2 text-sm">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between p-2 bg-muted rounded-md">
                    <div>
                      <p className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{log.resource}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-center text-muted-foreground py-4">No logs found</li>
              )}
            </ul>

            <Button variant="outline" className="mt-4 w-full" onClick={() => fetchAuditLogs(100)}>View Full Security Log</Button>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Medical Data Privacy</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share-data" className="mb-1 block">Share Medical Data with Providers</Label>
                  <p className="text-xs text-muted-foreground">Allow healthcare providers to access your medical records</p>
                </div>
                <Switch
                  id="share-data"
                  checked={shareMedicalData}
                  onCheckedChange={(checked) => {
                    setShareMedicalData(checked);
                    toast.info(`Medical data sharing ${checked ? 'enabled' : 'disabled'}. Remember to save changes.`);
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="research-usage" className="mb-1 block">Allow Anonymous Data for Research</Label>
                  <p className="text-xs text-muted-foreground">Contribute anonymized data to improve healthcare research</p>
                </div>
                <Switch
                  id="research-usage"
                  checked={allowResearchUsage}
                  onCheckedChange={(checked) => {
                    setAllowResearchUsage(checked);
                    toast.info(`Research data usage ${checked ? 'enabled' : 'disabled'}. Remember to save changes.`);
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="profile-search" className="mb-1 block">Show Profile in Provider Search</Label>
                  <p className="text-xs text-muted-foreground">Allow your profile to appear in provider search results</p>
                </div>
                <Switch
                  id="profile-search"
                  checked={showInSearch}
                  onCheckedChange={(checked) => {
                    setShowInSearch(checked);
                    toast.info(`Profile search visibility ${checked ? 'enabled' : 'disabled'}. Remember to save changes.`);
                  }}
                />
              </div>

              <Separator />

              <div>
                <Label htmlFor="data-retention" className="mb-1 block">Data Retention Period</Label>
                <p className="text-xs text-muted-foreground mb-2">Choose how long to keep your data after account closure</p>
                <Select
                  value={dataRetentionPeriod}
                  onValueChange={setDataRetentionPeriod}
                >
                  <SelectTrigger id="data-retention">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={updatePrivacySettings} disabled={isLoading} className="w-full">
                {isLoading ? "Saving..." : "Save Privacy Settings"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Data Requests</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Request Data Export</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Download a copy of all your personal data stored in our system
                </p>
                <Button variant="outline" onClick={() => submitDataRequest('export')} disabled={isLoading}>Request Data Export</Button>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-1">Right to be Forgotten</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Request deletion of all your personal data (apart from that required by law)
                </p>
                <Button variant="outline" onClick={() => submitDataRequest('deletion')} disabled={isLoading}>Request Data Deletion</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-destructive/50">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Danger Zone</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Submit a deletion request for review. Information that must be retained by law may be kept securely.
              </p>

              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Request Account Deletion"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrivacySecurityPage;
