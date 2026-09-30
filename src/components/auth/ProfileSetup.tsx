import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ALL_CLINICIAN_ROLES } from "@/config/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('patient');
  const [avatarUploading, setAvatarUploading] = useState(false);
  // Uploaded avatar URL — uploaded immediately on file select (not deferred
  // to submit) so a page remount / session bounce can never silently drop it.
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    bio: "",
  });

  useEffect(() => {
    const loadUserMeta = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata || {};
      setUserRole(meta.role || 'patient');
      setFormData(prev => ({
        ...prev,
        first_name: meta.first_name || '',
        last_name: meta.last_name || '',
        phone: meta.phone || '',
      }));
    };
    loadUserMeta();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    // Instant local preview…
    setAvatarPreviewUrl(URL.createObjectURL(file));
    // …then upload immediately so the result survives remounts / session
    // bounces. Failures surface here as a toast, never a silent skip.
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload a photo");
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
        contentType: file.type || 'image/png',
        upsert: true,
      });
      if (error) throw error;
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      setUploadedAvatarUrl(publicUrl);
      toast.success("Photo uploaded");
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      toast.error(err?.message || "Photo upload failed — please try again");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarUploading) {
      toast.info("Please wait for your photo to finish uploading");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Build payload — omit empty strings (esp. date_of_birth which is a DATE column)
      // and skip DOB/gender entirely for business accounts.
      const payload: Record<string, any> = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        is_profile_complete: true,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.bio.trim()) payload.bio = formData.bio.trim();
      if (uploadedAvatarUrl) payload.avatar_url = uploadedAvatarUrl;
      if (!isBusiness) {
        if (formData.date_of_birth) payload.date_of_birth = formData.date_of_birth;
        if (formData.gender) payload.gender = formData.gender;
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload as any)
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Profile completed!");

      // Institution roles need to register their institution next
      if (isBusiness) {
        const { data: existing } = await supabase
          .from('healthcare_institutions')
          .select('id')
          .eq('admin_id', user.id)
          .maybeSingle();
        if (!existing) {
          navigate('/institution-registration', { replace: true });
          return;
        }
      }
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Profile completion failed:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // All 25 clinical professions get the professional profile treatment —
  // never a hardcoded subset (a stale allowlist silently dropped 19 cadres).
  const isProvider = (ALL_CLINICIAN_ROLES as readonly string[]).includes(userRole);
  const isBusiness = ['pharmacy', 'lab', 'institution_admin', 'institution_staff'].includes(userRole);

  const getTitle = () => {
    if (isBusiness) return "Complete Your Business Profile";
    if (isProvider) return "Complete Your Professional Profile";
    return "Complete Your Profile";
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">{getTitle()}</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarPreviewUrl || ""} />
            <AvatarFallback className="text-lg">{formData.first_name?.[0]}{formData.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <Input type="file" accept="image/*" onChange={handleFileChange} className="mt-4 max-w-xs" disabled={avatarUploading} />
          {avatarUploading && (
            <p className="mt-2 text-xs text-graphite-500 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading photo…
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">First Name</Label>
            <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+260..." />
          </div>
          {!isBusiness && (
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input id="date_of_birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} />
            </div>
          )}
          {!isBusiness && (
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(isProvider || isBusiness) && (
            <div className="md:col-span-2">
              <Label htmlFor="bio">{isBusiness ? "About your business" : "Professional bio"}</Label>
              <Input id="bio" name="bio" value={formData.bio} onChange={handleInputChange} 
                placeholder={isBusiness ? "Brief description of your facility" : "Brief professional summary"} />
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading || avatarUploading}>
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : avatarUploading ? "Uploading photo..." : "Complete Profile"}
        </Button>
      </form>
    </div>
  );
};
