import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Edit, Save, MapPin, Phone, Mail, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";
import { supabase } from "@/integrations/supabase/client";
import { ProfileStats } from "@/components/ProfileStats";

const Profile = () => {
  const { user, profile } = useAuth();
  const { showSuccess } = useSuccessFeedback();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: user?.email || "",
    phone: profile?.phone || "",
    bio: profile?.bio || "",
    location: profile?.location || profile?.address || ""
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          bio: formData.bio,
          address: formData.location
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      showSuccess({ message: "Profile updated successfully!" });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-canvas py-8 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <div className="vf-card !p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-primary-500/20 shadow-card">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary-50 text-primary-500 text-2xl font-display font-medium">
                  {formData.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-button hover:bg-primary-600 transition-transform active:scale-95"
                title="Change Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="font-display text-3xl font-medium text-midnight tracking-tight">
                  {formData.firstName} {formData.lastName || "Account"}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill text-xs font-medium bg-success-50 text-success-500 border border-success-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {profile?.role === 'health_personnel' || profile?.role === 'doctor' ? 'Verified Practitioner' : 'Verified Patient'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-graphite-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-primary-500" />
                  {formData.email}
                </span>
                {formData.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-primary-500" />
                    {formData.phone}
                  </span>
                )}
                {formData.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary-500" />
                    {formData.location}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => setIsEditing(!isEditing)}
              className={`rounded-full px-6 h-11 text-xs font-extrabold shadow-sm transition-all ${
                isEditing
                  ? "bg-slate-900 hover:bg-black text-white"
                  : "bg-[#0073ea] hover:bg-[#0060c7] text-white"
              }`}
            >
              {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? "Save Profile" : "Edit Details"}
            </Button>
          </div>
        </div>

        {/* Profile Details Form */}
        <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-[#e6e9ef] dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5 text-[#0073ea]" />
              Personal &amp; Clinical Information
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your personal information, emergency contact details, and clinical identity.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  disabled={!isEditing}
                  className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs focus:border-[#0073ea] focus:bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  disabled={!isEditing}
                  className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs focus:border-[#0073ea] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Email Address (Primary)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs opacity-75"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  disabled={!isEditing}
                  placeholder="+1 (555) 123-4567"
                  className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs focus:border-[#0073ea] focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Address / Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                disabled={!isEditing}
                placeholder="City, State, Country"
                className="h-11 rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs focus:border-[#0073ea] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase">Bio / Clinical Background</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="Brief summary of your clinical practice, background, or personal health notes..."
                className="rounded-2xl border-2 border-[#e6e9ef] dark:border-slate-800 bg-[#f5f7fa] dark:bg-slate-950 font-medium text-xs focus:border-[#0073ea] focus:bg-white resize-none"
              />
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 rounded-full h-11 bg-[#0073ea] hover:bg-[#0060c7] text-white font-extrabold text-xs shadow-sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-full h-11 border-2 border-slate-200 dark:border-slate-800 font-extrabold text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Widget */}
        <div className="rounded-3xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <ProfileStats userId={user?.id} />
        </div>
      </div>
    </div>
  );
};

export default Profile;