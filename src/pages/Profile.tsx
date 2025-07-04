import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Edit, Save, MapPin, Phone, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useSuccessFeedback } from "@/hooks/use-success-feedback";

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
    location: profile?.location || ""
  });

  const handleSave = () => {
    // In real app, this would update the profile via API
    showSuccess({ message: "Profile updated successfully!" });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-trust-100 shadow-trust">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-trust-100">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-trust-100 text-trust-600 text-xl">
                  {formData.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-trust-700">
                {formData.firstName} {formData.lastName || "Welcome"}
              </h1>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {formData.email}
              </div>
              <Badge variant="secondary" className="bg-trust-50 text-trust-600">
                {profile?.role === 'health_personnel' ? 'Healthcare Provider' : 'Patient'}
              </Badge>
            </div>

            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "default" : "outline"}
              className="w-full max-w-sm"
            >
              {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? "Save Changes" : "Edit Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card className="border-trust-100 shadow-trust">
        <CardHeader>
          <CardTitle className="text-trust-700">Personal Information</CardTitle>
          <CardDescription>
            Manage your personal details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                disabled={!isEditing}
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                disabled={!isEditing}
                className="disabled:opacity-70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="disabled:opacity-70"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={!isEditing}
              className="disabled:opacity-70"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              disabled={!isEditing}
              className="disabled:opacity-70"
              placeholder="City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              disabled={!isEditing}
              className="disabled:opacity-70 min-h-[100px]"
              placeholder="Tell us about yourself..."
            />
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-trust-100 shadow-trust">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-trust-600">12</div>
            <div className="text-sm text-muted-foreground">Appointments</div>
          </CardContent>
        </Card>
        <Card className="border-trust-100 shadow-trust">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-trust-600">3</div>
            <div className="text-sm text-muted-foreground">Providers</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;