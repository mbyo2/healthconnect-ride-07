import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, MapPin, Heart, User, FileText, Navigation, Clock, Shield } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EmergencyResponse = () => {
    const [locationSharing, setLocationSharing] = useState(false);

    const emergencyContacts = [
        { id: 1, name: 'Dr. Sarah Johnson', relation: 'Primary Care', phone: '+1 (555) 123-4567', priority: 1 },
        { id: 2, name: 'John Doe', relation: 'Emergency Contact', phone: '+1 (555) 987-6543', priority: 2 },
        { id: 3, name: 'City Hospital', relation: 'Nearest Hospital', phone: '+1 (555) 911-0000', priority: 3 },
    ];

    const nearbyHospitals = [
        { id: 1, name: 'City General Hospital', distance: '1.2 km', time: '5 min', emergency: true },
        { id: 2, name: 'St. Mary\'s Medical Center', distance: '2.8 km', time: '10 min', emergency: true },
        { id: 3, name: 'Community Health Clinic', distance: '3.5 km', time: '12 min', emergency: false },
    ];

    const medicalInfo = {
        bloodType: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Hypertension'],
        medications: ['Lisinopril 10mg'],
    };

    const handleEmergencyCall = () => {
        // In a real app, this would trigger emergency services
        alert('Emergency services would be contacted. This is a demo.');
    };

    const handleShareLocation = () => {
        setLocationSharing(!locationSharing);
        // In a real app, this would share location with emergency contacts
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-red-50/20 to-background p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                            <AlertTriangle className="w-10 h-10 text-red-600" />
                            Emergency Response
                        </h1>
                        <p className="text-muted-foreground mt-1">24/7 emergency assistance and medical information</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-4 py-2">
                        <Clock className="w-4 h-4 mr-2" />
                        Available 24/7
                    </Badge>
                </div>

                {/* Emergency Button */}
                <Card className="border-red-500 bg-red-50/50">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-6 rounded-full bg-red-100">
                                <Phone className="w-12 h-12 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Need Immediate Help?</h2>
                                <p className="text-muted-foreground mt-2">Press the button below to call emergency services</p>
                            </div>
                            <Button
                                size="lg"
                                className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-xl h-auto"
                                onClick={handleEmergencyCall}
                            >
                                <Phone className="w-6 h-6 mr-3" />
                                Call Emergency Services
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                This will contact local emergency services and share your location and medical information
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Emergency Contacts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Emergency Contacts
                            </CardTitle>
                            <CardDescription>Quick access to your emergency contacts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {emergencyContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{contact.name}</h4>
                                        <p className="text-sm text-muted-foreground">{contact.relation}</p>
                                        <p className="text-sm mt-1">{contact.phone}</p>
                                    </div>
                                    <Button size="sm">
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full">
                                <User className="w-4 h-4 mr-2" />
                                Manage Contacts
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Medical Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Critical Medical Information
                            </CardTitle>
                            <CardDescription>Information shared with emergency responders</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Blood Type</p>
                                    <p className="text-xl font-bold text-red-600">{medicalInfo.bloodType}</p>
                                </div>
                                <div className="p-3 border rounded-lg">
                                    <p className="text-sm text-muted-foreground">Allergies</p>
                                    <p className="text-sm font-medium">{medicalInfo.allergies.join(', ')}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium mb-1">Medical Conditions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {medicalInfo.conditions.map((condition, index) => (
                                            <Badge key={index} variant="outline">{condition}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-1">Current Medications</p>
                                    <div className="flex flex-wrap gap-2">
                                        {medicalInfo.medications.map((med, index) => (
                                            <Badge key={index} variant="outline">{med}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button variant="outline" className="w-full">
                                <FileText className="w-4 h-4 mr-2" />
                                Update Medical Info
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Nearby Hospitals */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Nearby Hospitals & Clinics
                        </CardTitle>
                        <CardDescription>Emergency facilities near your current location</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {nearbyHospitals.map((hospital) => (
                            <div key={hospital.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{hospital.name}</h4>
                                        {hospital.emergency && (
                                            <Badge variant="destructive" className="text-xs">24/7 Emergency</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {hospital.distance}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {hospital.time}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline">
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Directions
                                    </Button>
                                    <Button size="sm">
                                        <Phone className="w-4 h-4 mr-2" />
                                        Call
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Location Sharing */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-100">
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Location Sharing</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Enable location sharing to allow emergency contacts and responders to find you quickly in case of an emergency.
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <Button
                                        variant={locationSharing ? "destructive" : "default"}
                                        onClick={handleShareLocation}
                                    >
                                        <MapPin className="w-4 h-4 mr-2" />
                                        {locationSharing ? 'Stop Sharing Location' : 'Share My Location'}
                                    </Button>
                                    {locationSharing && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            Location Sharing Active
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Safety Tips */}
                <Card>
                    <CardHeader>
                        <CardTitle>Emergency Preparedness Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                                <span className="text-red-600 font-bold">1.</span>
                                <span>Keep your emergency contacts up to date and ensure they know they're listed</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-red-600 font-bold">2.</span>
                                <span>Update your medical information regularly, especially after new diagnoses or medication changes</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-red-600 font-bold">3.</span>
                                <span>Familiarize yourself with the locations of nearby hospitals and emergency facilities</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-red-600 font-bold">4.</span>
                                <span>Enable location services to ensure emergency responders can find you quickly</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-red-600 font-bold">5.</span>
                                <span>For life-threatening emergencies, always call your local emergency number (911 in the US)</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EmergencyResponse;
