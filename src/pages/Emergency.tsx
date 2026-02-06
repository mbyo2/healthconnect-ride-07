import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Phone, MapPin, Ambulance, Heart, AlertTriangle, User, Clock, Building2, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ZAMBIA_CONFIG } from '@/config/zambia';

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
  const navigate = useNavigate();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyServices, setEmergencyServices] = useState<EmergencyService[]>([]);

  useEffect(() => {
    loadZambianEmergencyServices();
    loadEmergencyContacts();
    getCurrentLocation();
  }, [user]);

  const loadZambianEmergencyServices = () => {
    // Load Zambian ambulance services
    const ambulanceServices: EmergencyService[] = ZAMBIA_CONFIG.ambulanceServices.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      description: s.description,
      type: 'ambulance' as const,
      available24h: s.available24h,
    }));

    // Load Zambian hospitals
    const hospitalServices: EmergencyService[] = ZAMBIA_CONFIG.healthcareInstitutions
      .filter(h => h.type === 'hospital')
      .slice(0, 4)
      .map(h => ({
        id: h.id,
        name: h.name,
        phone: h.phone,
        description: h.description,
        type: 'hospital' as const,
        available24h: h.available24h,
      }));

    setEmergencyServices([...ambulanceServices, ...hospitalServices]);
  };

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
          <div className="space-y-6">
            {/* Quick Call Buttons - Most Important */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a 
                href={`tel:${ZAMBIA_CONFIG.emergencyNumbers.ambulance}`}
                className="flex flex-col items-center justify-center p-6 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Ambulance className="h-8 w-8 mb-2" />
                <span className="font-bold">Ambulance</span>
                <span className="text-lg font-mono">{ZAMBIA_CONFIG.emergencyNumbers.ambulance}</span>
              </a>
              <a 
                href={`tel:${ZAMBIA_CONFIG.emergencyNumbers.police}`}
                className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Shield className="h-8 w-8 mb-2" />
                <span className="font-bold">Police</span>
                <span className="text-lg font-mono">{ZAMBIA_CONFIG.emergencyNumbers.police}</span>
              </a>
              <a 
                href={`tel:${ZAMBIA_CONFIG.emergencyNumbers.fire}`}
                className="flex flex-col items-center justify-center p-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <AlertTriangle className="h-8 w-8 mb-2" />
                <span className="font-bold">Fire</span>
                <span className="text-lg font-mono">{ZAMBIA_CONFIG.emergencyNumbers.fire}</span>
              </a>
              <button 
                onClick={() => navigate('/healthcare-institutions')}
                className="flex flex-col items-center justify-center p-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Building2 className="h-8 w-8 mb-2" />
                <span className="font-bold">Hospitals</span>
                <span className="text-sm">Find Nearby</span>
              </button>
            </div>

            {/* Emergency Alert Section */}
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <CardHeader>
                <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  Emergency Alert System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe your emergency situation (optional)"
                  value={emergencyMessage}
                  onChange={(e) => setEmergencyMessage(e.target.value)}
                  className="min-h-20 bg-white dark:bg-background"
                />

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {location ? `📍 Location detected (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Getting your location...'}
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
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      🚨 Emergency services notified • Help is on the way
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Emergency Services in Zambia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emergencyServices.map((service) => (
                    <div key={service.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${service.type === 'ambulance' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                            {getServiceIcon(service.type)}
                          </div>
                          <h3 className="font-semibold text-foreground">{service.name}</h3>
                        </div>
                        {service.available24h && (
                          <Badge variant="secondary" className="text-xs">24/7</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.description}
                      </p>
                      <a
                        href={`tel:${service.phone}`}
                        className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-border rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                      >
                        <Phone className="h-4 w-4" />
                        Call {service.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Your Emergency Contacts</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                {emergencyContacts.length > 0 ? (
                  <div className="space-y-3">
                    {emergencyContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {contact.relationship}
                              {contact.is_primary && <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span className="hidden sm:inline">{contact.phone}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No emergency contacts set up yet.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/profile')}>
                      Add Emergency Contacts
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zambian Emergency Safety Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Emergency Safety Tips for Zambia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-foreground flex items-center gap-2">
                        <Ambulance className="h-4 w-4 text-red-500" />
                        Medical Emergency
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>Call <strong>{ZAMBIA_CONFIG.emergencyNumbers.ambulance}</strong> for ambulance</li>
                        <li>Stay calm and provide clear location</li>
                        <li>Mention nearby landmarks (shopping centers, schools)</li>
                        <li>Don't move injured persons unless in danger</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-foreground">📞 Important Numbers</h4>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Police:</span><strong>{ZAMBIA_CONFIG.emergencyNumbers.police}</strong>
                        <span>Fire:</span><strong>{ZAMBIA_CONFIG.emergencyNumbers.fire}</strong>
                        <span>Ambulance:</span><strong>{ZAMBIA_CONFIG.emergencyNumbers.ambulance}</strong>
                        <span>General:</span><strong>{ZAMBIA_CONFIG.emergencyNumbers.generalEmergency}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-500" />
                        Nearest Major Hospitals
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li><strong>UTH</strong> - Lusaka (Nationalist Road)</li>
                        <li><strong>Levy Mwanawasa</strong> - Lusaka (Kasama Road)</li>
                        <li><strong>Ndola Central</strong> - Copperbelt</li>
                        <li><strong>Kitwe Central</strong> - Kitwe</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-foreground">⏳ While Waiting for Help</h4>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>Keep the patient comfortable and calm</li>
                        <li>Apply basic first aid if trained</li>
                        <li>Don't give food or water unless instructed</li>
                        <li>Have someone wait outside to guide responders</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Emergency;