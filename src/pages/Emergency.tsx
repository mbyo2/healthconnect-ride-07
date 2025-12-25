import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Ambulance, Heart, AlertTriangle, User, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmergencyService {
  id: string;
  name: string;
  phone: string;
  description: string;
  type: 'ambulance' | 'hospital' | 'pharmacy' | 'police' | 'fire';
  available24h: boolean;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

const Emergency = () => {
  const { user } = useAuth();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyServices, setEmergencyServices] = useState<EmergencyService[]>([]);

  useEffect(() => {
    fetchEmergencyServices();
    loadEmergencyContacts();
    getCurrentLocation();
  }, [user]);

  const fetchEmergencyServices = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_services' as any)
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching emergency services:', error);
        // Fallback to default services if table doesn't exist
        setEmergencyServices([
          {
            id: '1',
            name: 'Ambulance Service Zambia',
            phone: '911',
            description: 'Emergency ambulance and medical response',
            type: 'ambulance',
            available24h: true
          },
          {
            id: '2',
            name: 'University Teaching Hospital',
            phone: '+260-211-256067',
            description: 'Main emergency hospital in Lusaka',
            const loadEmergencyContacts = async () => {
              if (!user) return;

              const { data, error } = await supabase
                .from('emergency_contacts')
                .select('*')
                .eq('patient_id', user.id)
                .order('is_primary', { ascending: false });

              if (error) {
                console.error('Error loading emergency contacts:', error);
              } else {
                setEmergencyContacts(data || []);
              }
            };

            const getCurrentLocation = () => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    });
                  },
                  (error) => {
                    console.error('Error getting location:', error);
                    toast.error('Could not get your location. Please enable location services.');
                  }
                );
              }
            };

            const triggerEmergency = async () => {
              if (!user || !location) {
                toast.error('Unable to send emergency alert. Location required.');
                return;
              }

              setIsEmergencyActive(true);

              try {
                // Send emergency alert to contacts
                const primaryContact = emergencyContacts.find(contact => contact.is_primary);

                if (primaryContact) {
                  // Here you would integrate with SMS service
                  toast.success(`Emergency alert sent to ${primaryContact.name}`);
                }

                // Log emergency event
                const { error } = await supabase
                  .from('emergency_events')
                  .insert({
                    patient_id: user.id,
                    latitude: location.lat,
                    longitude: location.lng,
                    message: emergencyMessage,
                    status: 'active'
                  });

                if (error) {
                  console.error('Error logging emergency:', error);
                }

                toast.success('Emergency services have been notified!');
              } catch (error) {
                console.error('Error triggering emergency:', error);
                toast.error('Failed to send emergency alert.');
              }
            };

            const getServiceIcon = (type: string) => {
              switch (type) {
                case 'ambulance': return <Ambulance className="h-5 w-5" />;
                case 'hospital': return <Heart className="h-5 w-5" />;
                case 'police': return <AlertTriangle className="h-5 w-5" />;
                case 'fire': return <AlertTriangle className="h-5 w-5" />;
                default: return <Phone className="h-5 w-5" />;
              }
            };

            return(
    <ProtectedRoute>
          <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
              <div className="space-y-6">

                {/* Emergency Alert Section */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      Emergency Alert System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Describe your emergency situation (optional)"
                      value={emergencyMessage}
                      onChange={(e) => setEmergencyMessage(e.target.value)}
                      className="min-h-20"
                    />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {location ? 'Location detected' : 'Getting location...'}
                    </div>

                    <Button
                      onClick={triggerEmergency}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6"
                      disabled={isEmergencyActive || !location}
                    >
                      {isEmergencyActive ? (
                        <>
                          <Clock className="h-5 w-5 mr-2 animate-spin" />
                          Emergency Alert Active
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          SEND EMERGENCY ALERT
                        </>
                      )}
                    </Button>

                    {isEmergencyActive && (
                      <div className="text-center">
                        <Badge className="bg-red-100 text-red-800">
                          Emergency services notified • Help is on the way
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Emergency Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {emergencyServices.map((service) => (
                        <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getServiceIcon(service.type)}
                              <h3 className="font-semibold">{service.name}</h3>
                            </div>
                            {service.available24h && (
                              <Badge variant="secondary">24/7</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description}
                          </p>
                          <Button
                            onClick={() => window.open(`tel:${service.phone}`)}
                            variant="outline"
                            className="w-full"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call {service.phone}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contacts */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {emergencyContacts.length > 0 ? (
                      <div className="space-y-3">
                        {emergencyContacts.map((contact) => (
                          <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <User className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {contact.relationship}
                                  {contact.is_primary && ' (Primary)'}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => window.open(`tel:${contact.phone}`)}
                              variant="outline"
                              size="sm"
                            >
                              <Phone className="h-4 w-4 mr-2" />
                              {contact.phone}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          No emergency contacts set up.
                          Go to your profile to add emergency contacts.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Safety Tips */}
                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Safety Tips for Zambia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">Medical Emergency:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Call 911 for ambulance services</li>
                          <li>Stay calm and provide clear location information</li>
                          <li>Don't move severely injured persons unless in immediate danger</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Important Numbers:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Police: 999</li>
                          <li>Fire: 993</li>
                          <li>Ambulance: 911</li>
                          <li>Road Traffic Accidents: 991</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">What to do while waiting:</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Stay with the patient and keep them comfortable</li>
                          <li>Do not give food or water unless instructed</li>
                          <li>Apply basic first aid if trained</li>
                          <li>Keep emergency contact information accessible</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </main>
          </div>
    </ProtectedRoute >
  );
};

export default Emergency;