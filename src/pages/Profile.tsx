import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, Settings, Bell, Shield, LogOut, 
  Star, MapPin, Phone, Mail, Calendar, 
  Clock, Award, FileText, Heart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HealthPersonnelApplicationForm } from "@/components/HealthPersonnelApplicationForm";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Application = Database['public']['Tables']['health_personnel_applications']['Row'];

const Profile = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);

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

  const isHealthcareProvider = userRole === 'health_personnel';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-14 px-4 pb-20">
        <Card className="p-6 mb-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=800" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">
                    {isHealthcareProvider ? "Dr. Michael Chen" : "John Doe"}
                  </h2>
                  <p className="text-gray-500">
                    {isHealthcareProvider ? "Emergency Medicine" : "Patient"}
                  </p>
                </div>
                <Button variant="outline">Edit Profile</Button>
              </div>
              
              {isHealthcareProvider && (
                <div className="mt-4 flex items-center gap-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    4.9 <Star className="w-3 h-3 fill-yellow-400" />
                  </Badge>
                  <span className="text-gray-500">500+ consultations</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {isHealthcareProvider && !applicationStatus && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Complete Your Application</h2>
            <HealthPersonnelApplicationForm />
          </div>
        )}

        {applicationStatus && (
          <Card className="mt-6 p-4">
            <h3 className="font-semibold">Application Status</h3>
            <p className="text-gray-600 mt-2">
              Your application is currently {applicationStatus}
            </p>
          </Card>
        )}

        <div className="mt-6 space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 h-12">
            <Settings className="w-5 h-5" />
            Settings
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 h-12">
            <Shield className="w-5 h-5" />
            Privacy
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 h-12 text-red-600 hover:text-red-700">
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Profile;