import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, Settings, Bell, Shield, LogOut, 
  Star, MapPin, Phone, Mail, Calendar 
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Profile = Database['public']['Tables']['profiles']['Row'];

const Profile = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile && !profileError) {
          setUserRole(profile.role);
          
          if (profile.role === 'health_personnel') {
            const { data: application, error: applicationError } = await supabase
              .from('health_personnel_applications')
              .select('status')
              .eq('user_id', user.id)
              .single();
            
            if (application && !applicationError) {
              setApplicationStatus(application.status);
            }
          }
        }
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/login");
    }
  };

  const isHealthcareProvider = userRole === 'health_personnel';

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>
              <User className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isHealthcareProvider ? "Dr. Michael Chen" : "John Doe"}
                </h1>
                <p className="text-muted-foreground">
                  {isHealthcareProvider ? "Emergency Medicine" : "Patient"}
                </p>
              </div>
              <Button variant="outline">Edit Profile</Button>
            </div>
            
            {isHealthcareProvider && (
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="flex items-center gap-1">
                  4.9 <Star className="w-3 h-3 fill-current" />
                </Badge>
                <span className="text-muted-foreground">500+ consultations</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>john.doe@example.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+1 234 567 890</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>San Francisco, CA</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Joined January 2024</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isHealthcareProvider && !applicationStatus && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Complete Your Application</h2>
          <HealthPersonnelApplicationForm />
        </Card>
      )}

      {applicationStatus && (
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-foreground">Application Status</h3>
          <p className="text-muted-foreground mt-2">
            Your application is currently {applicationStatus}
          </p>
        </Card>
      )}

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-2 h-12">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2 h-12">
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2 h-12">
          <Shield className="w-5 h-5" />
          <span>Privacy & Security</span>
        </Button>
        <Button 
          variant="destructive" 
          className="w-full justify-start gap-2 h-12"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Profile;