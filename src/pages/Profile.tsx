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

const Profile = () => {
  const isHealthcareProvider = false; // This would come from auth context in a real app

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

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Information</TabsTrigger>
            {isHealthcareProvider ? (
              <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            ) : (
              <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="info">
            <Card className="p-4">
              <div className="space-y-4">
                {isHealthcareProvider ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Experience</h3>
                        <p className="text-sm text-gray-500">10+ years in Emergency Medicine</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Specializations</h3>
                        <p className="text-sm text-gray-500">Emergency Medicine, Trauma Care, Critical Care</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Health Information</h3>
                        <p className="text-sm text-gray-500">Blood Type: O+</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Allergies</h3>
                        <p className="text-sm text-gray-500">None reported</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Location</h3>
                    <p className="text-sm text-gray-500">Brooklyn, NY</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Phone</h3>
                    <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-sm text-gray-500">contact@example.com</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value={isHealthcareProvider ? "reviews" : "history"}>
            <Card className="p-4">
              {isHealthcareProvider ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((review) => (
                    <div key={review} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>P{review}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">Patient {review}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-yellow-400" />
                          <span className="ml-1">5.0</span>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-600">
                        Excellent care and very professional service. Highly recommended!
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3].map((appointment) => (
                    <div key={appointment} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Dr. Sarah Johnson</h3>
                          <p className="text-sm text-gray-500">General Checkup</p>
                        </div>
                        <Badge>Completed</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          March 15, 2024
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          10:00 AM
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

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