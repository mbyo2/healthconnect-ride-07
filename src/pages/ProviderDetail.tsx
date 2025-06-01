
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, Star } from "lucide-react";

const ProviderDetail = () => {
  const { id } = useParams();

  // Mock provider data - in a real app, this would be fetched from an API
  const provider = {
    id,
    name: "Dr. Sarah Johnson",
    specialty: "Family Medicine",
    rating: 4.8,
    reviews: 124,
    address: "123 Medical Center Dr, City, State 12345",
    phone: "(555) 123-4567",
    hours: "Mon-Fri: 8AM-5PM",
    bio: "Dr. Johnson is a board-certified family medicine physician with over 15 years of experience. She specializes in preventive care, chronic disease management, and patient education.",
    education: ["MD - Harvard Medical School", "Residency - Johns Hopkins"],
    certifications: ["Board Certified in Family Medicine", "Advanced Cardiac Life Support"],
    languages: ["English", "Spanish"],
    insuranceAccepted: ["Blue Cross", "Aetna", "Cigna", "Medicare"]
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{provider.name}</CardTitle>
                  <CardDescription className="text-lg">{provider.specialty}</CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 font-medium">{provider.rating}</span>
                    </div>
                    <span className="text-muted-foreground">({provider.reviews} reviews)</span>
                  </div>
                </div>
                <Button size="lg">Book Appointment</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{provider.address}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{provider.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{provider.hours}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{provider.bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Education & Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Education</h4>
                <ul className="space-y-1">
                  {provider.education.map((item, index) => (
                    <li key={index} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Certifications</h4>
                <ul className="space-y-1">
                  {provider.certifications.map((item, index) => (
                    <li key={index} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {provider.languages.map((language, index) => (
                  <Badge key={index} variant="secondary">{language}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Accepted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {provider.insuranceAccepted.map((insurance, index) => (
                  <div key={index} className="text-sm text-muted-foreground">{insurance}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;
