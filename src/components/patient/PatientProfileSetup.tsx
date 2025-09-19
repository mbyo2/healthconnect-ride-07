
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Phone, Calendar, MapPin, Camera } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedButton } from "@/components/ui/animated-button";
import { useFeedbackSystem } from "@/hooks/use-feedback-system";

export const PatientProfileSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { triggerSuccess, triggerError } = useFeedbackSystem();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAvatar(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const uploadAvatar = async (userId: string) => {
    if (!avatar) return null;
    
    const fileExt = avatar.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatar);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let avatarUrl = null;
      if (avatar) {
        avatarUrl = await uploadAvatar(user.id);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          avatar_url: avatarUrl,
          is_profile_complete: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      triggerSuccess("Profile setup completed successfully!");
      toast.success("Profile setup completed successfully!");
      navigate('/');
    } catch (error: any) {
      const errorMessage = error.message || "Failed to complete profile setup";
      triggerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with clear instructions */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
            <User className="h-4 w-4" />
            Patient Profile Setup
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Complete Your Patient Profile
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Please fill out your information below. This helps us provide you with the best possible care. 
            <span className="block mt-2 text-sm text-gray-600">
              Fields marked with * are required to continue
            </span>
          </p>
        </div>
        
        <Card className="shadow-xl border-2 border-gray-200 bg-white">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Photo Section */}
              <div className="text-center pb-8 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center justify-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Photo (Optional)
                </h2>
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-24 h-24 border-4 border-blue-200 shadow-lg">
                    <AvatarImage src={avatarUrl || ""} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                      {formData.first_name ? formData.first_name[0] : "📷"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-64 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-600">
                      Upload a clear photo to help your healthcare providers identify you
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <User className="h-5 w-5" />
                  Personal Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="first_name" className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      First Name *
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                      placeholder="Enter your first name"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="last_name" className="text-base font-semibold text-gray-800">
                      Last Name *
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </h2>
                
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-base font-semibold text-gray-800">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                    placeholder="(555) 123-4567"
                  />
                  <p className="text-sm text-gray-600">
                    We'll use this to contact you about appointments and important updates
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Calendar className="h-5 w-5" />
                  Personal Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="date_of_birth" className="text-base font-semibold text-gray-800">
                      Date of Birth
                    </Label>
                    <Input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-base font-semibold text-gray-800">
                      Gender
                    </Label>
                    <Select onValueChange={(value) => handleSelectChange("gender", value)}>
                      <SelectTrigger className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-gray-200 shadow-lg">
                        <SelectItem value="male" className="text-base py-3">Male</SelectItem>
                        <SelectItem value="female" className="text-base py-3">Female</SelectItem>
                        <SelectItem value="other" className="text-base py-3">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say" className="text-base py-3">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="address" className="text-base font-semibold text-gray-800">
                      Street Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                      placeholder="123 Main Street"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="city" className="text-base font-semibold text-gray-800">
                        City
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                        placeholder="Your city"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="state" className="text-base font-semibold text-gray-800">
                        State/Province
                      </Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                        placeholder="State"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="zip_code" className="text-base font-semibold text-gray-800">
                        ZIP/Postal Code
                      </Label>
                      <Input
                        id="zip_code"
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleInputChange}
                        className="h-12 text-base border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                        placeholder="12345"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-8 border-t border-gray-200">
                <AnimatedButton 
                  type="submit" 
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200" 
                  loading={loading}
                  loadingText="Setting up your profile..."
                >
                  Complete Profile Setup
                </AnimatedButton>
                
                <p className="text-center text-sm text-gray-600 mt-4">
                  By completing your profile, you agree to our terms of service and privacy policy
                </p>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};
