
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "@/components/LoadingScreen";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HealthcareProviderType } from "@/types/healthcare";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    specialty: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    provider_type: "doctor" as HealthcareProviderType, // Default value with proper type
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          toast.error("Session error. Please login again.");
          navigate("/login");
          return;
        }
        
        if (!session) {
          console.log("No session found, redirecting to login");
          navigate("/login");
          return;
        }
        
        fetchProfile(session.user.id);
      } catch (err) {
        console.error("Unexpected error during session check:", err);
        toast.error("An unexpected error occurred");
        navigate("/login");
      }
    };

    checkSession();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to fetch profile data");
        return;
      }
      
      setProfile(data);
      
      // Pre-fill form data with default provider type that matches allowed values
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone || "",
        specialty: data.specialty || "",
        bio: data.bio || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip_code: data.zip_code || "",
        provider_type: (data.provider_type as HealthcareProviderType) || "doctor", // Cast to ensure type safety
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      toast.error("Failed to fetch profile data");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Authentication error. Please login again.");
        navigate("/login");
        return;
      }
      
      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          is_profile_complete: true,
          updated_at: new Date().toISOString(),
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          specialty: formData.specialty,
          bio: formData.bio,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          provider_type: formData.provider_type,
        })
        .eq('id', user.id);
      
      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
        setIsLoading(false);
        return;
      }
      
      toast.success("Profile setup completed!");
      navigate("/provider-dashboard");
    } catch (err) {
      console.error("Unexpected error updating profile:", err);
      toast.error("Failed to update profile");
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          Complete Your Provider Profile
        </h1>
        
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="provider_type">Provider Type</Label>
                <Select
                  defaultValue={formData.provider_type}
                  onValueChange={(value) => handleSelectChange("provider_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                    <SelectItem value="pharmacy">Pharmacist</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="nursing_home">Nursing Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip_code">Zip Code</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full">
              Complete Profile
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
