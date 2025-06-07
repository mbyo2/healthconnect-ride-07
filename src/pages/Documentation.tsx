
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Users, 
  Shield, 
  Smartphone, 
  Heart, 
  Calendar,
  MessageSquare,
  Search,
  CreditCard,
  Video,
  FileText,
  Settings,
  HelpCircle
} from "lucide-react";

export default function Documentation() {
  const sections = [
    {
      title: "Getting Started",
      icon: <BookOpen className="h-5 w-5" />,
      items: [
        "Creating your account",
        "Setting up your profile",
        "Understanding user roles",
        "First appointment booking"
      ]
    },
    {
      title: "For Patients",
      icon: <Heart className="h-5 w-5" />,
      items: [
        "Finding healthcare providers",
        "Booking appointments",
        "Managing medical records",
        "Using telemedicine",
        "Payment and insurance"
      ]
    },
    {
      title: "For Healthcare Providers",
      icon: <Users className="h-5 w-5" />,
      items: [
        "Provider registration",
        "Managing your schedule",
        "Patient communication",
        "Digital prescriptions",
        "Revenue tracking"
      ]
    },
    {
      title: "Mobile App",
      icon: <Smartphone className="h-5 w-5" />,
      items: [
        "Installing the mobile app",
        "Push notifications",
        "Offline functionality",
        "Mobile-specific features"
      ]
    }
  ];

  const features = [
    {
      icon: <Search className="h-6 w-6" />,
      title: "Provider Search",
      description: "Find healthcare providers by specialty, location, and availability"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Appointment Management",
      description: "Book, reschedule, and track all your healthcare appointments"
    },
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Secure Messaging",
      description: "Communicate securely with your healthcare providers"
    },
    {
      icon: <Video className="h-6 w-6" />,
      title: "Telemedicine",
      description: "Virtual consultations from the comfort of your home"
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Payment Processing",
      description: "Secure payment processing for all healthcare services"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy & Security",
      description: "HIPAA-compliant platform ensuring your data is protected"
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Documentation</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about using Doc' O Clock - your comprehensive healthcare platform
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">Version 2.0</Badge>
          <Badge variant="outline">Last updated: Dec 2024</Badge>
        </div>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Get up and running with Doc' O Clock in just a few minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold">Sign Up</h3>
              <p className="text-sm text-muted-foreground">Create your account and verify your email</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold">Complete Profile</h3>
              <p className="text-sm text-muted-foreground">Add your personal and medical information</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold">Start Using</h3>
              <p className="text-sm text-muted-foreground">Find providers and book your first appointment</p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button>Get Started Now</Button>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center">Platform Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Documentation Sections */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center">Documentation Sections</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {sections.map((section, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full mt-4">
                  View {section.title} Docs
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            For developers integrating with our platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">REST API</h4>
              <p className="text-sm text-muted-foreground">
                Complete REST API documentation with examples and authentication guides
              </p>
              <Button variant="outline" size="sm">View REST API Docs</Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">WebHooks</h4>
              <p className="text-sm text-muted-foreground">
                Real-time notifications for appointment updates and system events
              </p>
              <Button variant="outline" size="sm">View WebHook Docs</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Need Help?
          </CardTitle>
          <CardDescription>
            Can't find what you're looking for? We're here to help!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">Contact Support</Button>
            <Button variant="outline">Community Forum</Button>
            <Button variant="outline">Video Tutorials</Button>
            <Button variant="outline">FAQ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
