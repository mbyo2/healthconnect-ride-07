
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Lock, Eye, EyeOff, KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const PrivacySecurityPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTwoFactor = () => {
    // In a real app, this would integrate with Supabase Auth's 2FA
    setIsTwoFactorEnabled(!isTwoFactorEnabled);
    toast(isTwoFactorEnabled ? "Two-factor authentication disabled" : "Two-factor authentication enabled");
  };

  const handleDeleteAccount = async () => {
    // This is a placeholder. In a real app, this would need a confirmation modal
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (confirmed) {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would call a Supabase Edge Function
        // that handles the full account deletion process safely
        const { error } = await supabase.rpc('delete_user');
        
        if (error) {
          throw error;
        }
        
        // Sign out the user after account deletion
        await supabase.auth.signOut();
        toast.success("Your account has been deleted");
        navigate("/auth");
      } catch (error: any) {
        console.error("Error deleting account:", error);
        toast.error(error.message || "Failed to delete account");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Privacy & Security</h1>
      </div>

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
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
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
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5" />
            <span>Enable Two-Factor Authentication</span>
          </div>
          <Switch
            checked={isTwoFactorEnabled}
            onCheckedChange={toggleTwoFactor}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Protect your account with an additional layer of security by requiring access to your phone when you sign in.
        </p>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Privacy Settings</h2>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-visibility">Public Profile</Label>
            <Switch id="profile-visibility" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="searchable">Searchable by Other Users</Label>
            <Switch id="searchable" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="data-collection">Allow Anonymous Usage Data Collection</Label>
            <Switch id="data-collection" defaultChecked />
          </div>
        </div>
      </Card>

      <Card className="p-6 border-red-200">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Danger Zone</h2>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all of your content. This action cannot be undone.
          </p>
          
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Delete Account"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PrivacySecurityPage;
