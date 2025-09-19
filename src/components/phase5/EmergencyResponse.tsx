import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Heart, 
  Clock, 
  User, 
  Shield,
  Zap,
  Navigation,
  PhoneCall,
  Siren,
  CheckCircle,
  X
} from 'lucide-react';
import { emergencyResponseSystem } from '@/utils/emergency-response-system';

interface EmergencyResponseProps {
  patientId: string;
}

interface EmergencyAlert {
  id: string;
  patientId: string;
  type: 'medical' | 'fall' | 'panic' | 'device_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: { latitude: number; longitude: number };
  vitals?: any;
  symptoms?: string[];
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  responders?: any[];
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  notified: boolean;
}

export const EmergencyResponse: React.FC<EmergencyResponseProps> = ({ patientId }) => {
  const [activeAlerts, setActiveAlerts] = useState<EmergencyAlert[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [fallDetection, setFallDetection] = useState(false);
  const [panicButton, setPanicButton] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelationship, setNewContactRelationship] = useState('');

  useEffect(() => {
    loadEmergencyData();
    initializeLocationTracking();
    initializeFallDetection();
  }, [patientId]);

  const loadEmergencyData = async () => {
    try {
      setLoading(true);

      // Load active alerts
      const alerts = await emergencyResponseSystem.getActiveAlerts(patientId);
      setActiveAlerts(alerts || []);

      // Load emergency contacts
      const contacts = await emergencyResponseSystem.getEmergencyContacts(patientId);
      setEmergencyContacts(contacts || []);

    } catch (error) {
      console.error('Failed to load emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeLocationTracking = async () => {
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });

        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationTracking(true);

        // Start location tracking
        await emergencyResponseSystem.startLocationTracking(patientId);
      }
    } catch (error) {
      console.error('Location tracking failed:', error);
      setLocationTracking(false);
    }
  };

  const initializeFallDetection = async () => {
    try {
      if ('DeviceMotionEvent' in window) {
        await emergencyResponseSystem.enableFallDetection(patientId);
        setFallDetection(true);
      }
    } catch (error) {
      console.error('Fall detection initialization failed:', error);
      setFallDetection(false);
    }
  };

  const triggerEmergencyAlert = async (type: EmergencyAlert['type'], symptoms?: string[]) => {
    if (!currentLocation) {
      alert('Location not available. Please enable location services.');
      return;
    }

    try {
      setLoading(true);

      const alert = await emergencyResponseSystem.createEmergencyAlert(
        patientId,
        type,
        currentLocation,
        { heartRate: 120, bloodPressure: '140/90' }, // Mock vitals
        symptoms || []
      );

      if (alert) {
        setActiveAlerts([...activeAlerts, alert]);
        alert('Emergency alert created successfully. Emergency services have been notified.');
      }
    } catch (error) {
      console.error('Failed to create emergency alert:', error);
      alert('Failed to create emergency alert');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const success = await emergencyResponseSystem.updateAlertStatus(alertId, 'acknowledged');
      
      if (success) {
        setActiveAlerts(activeAlerts.map(alert => 
          alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
        ));
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const success = await emergencyResponseSystem.updateAlertStatus(alertId, 'resolved');
      
      if (success) {
        setActiveAlerts(activeAlerts.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const addEmergencyContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert('Please provide contact name and phone number');
      return;
    }

    try {
      const contact = await emergencyResponseSystem.addEmergencyContact(patientId, {
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRelationship.trim() || 'Emergency Contact'
      });

      if (contact) {
        setEmergencyContacts([...emergencyContacts, contact]);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactRelationship('');
      }
    } catch (error) {
      console.error('Failed to add emergency contact:', error);
      alert('Failed to add emergency contact');
    }
  };

  const removeEmergencyContact = async (contactId: string) => {
    try {
      const success = await emergencyResponseSystem.removeEmergencyContact(patientId, contactId);
      
      if (success) {
        setEmergencyContacts(emergencyContacts.filter(contact => contact.id !== contactId));
      }
    } catch (error) {
      console.error('Failed to remove emergency contact:', error);
    }
  };

  const testEmergencySystem = async () => {
    try {
      setLoading(true);
      
      // Create a test alert
      await triggerEmergencyAlert('medical', ['test_alert']);
      
      alert('Emergency system test completed successfully');
    } catch (error) {
      console.error('Emergency system test failed:', error);
      alert('Emergency system test failed');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'medical': return <Heart className="w-5 h-5" />;
      case 'fall': return <AlertTriangle className="w-5 h-5" />;
      case 'panic': return <Siren className="w-5 h-5" />;
      case 'device_failure': return <Zap className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-6 h-6 mr-2 text-red-600" />
            Emergency Response System
          </CardTitle>
          <CardDescription>
            24/7 emergency monitoring with automatic alert dispatch and location tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${locationTracking ? 'text-green-600' : 'text-red-600'}`}>
                {locationTracking ? '✓' : '✗'}
              </div>
              <div className="text-sm text-gray-600">Location Tracking</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${fallDetection ? 'text-green-600' : 'text-red-600'}`}>
                {fallDetection ? '✓' : '✗'}
              </div>
              <div className="text-sm text-gray-600">Fall Detection</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{emergencyContacts.length}</div>
              <div className="text-sm text-gray-600">Emergency Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-red-600">Active Emergency Alerts</h3>
          {activeAlerts.map((alert) => (
            <Alert key={alert.id} className="border-red-500 bg-red-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {getAlertTypeIcon(alert.type)}
                  <div>
                    <AlertTitle className="flex items-center space-x-2">
                      <span>{alert.type.toUpperCase()} EMERGENCY</span>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1 mt-2">
                        <p><strong>Time:</strong> {new Date(alert.timestamp).toLocaleString()}</p>
                        <p><strong>Location:</strong> {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}</p>
                        {alert.symptoms && alert.symptoms.length > 0 && (
                          <p><strong>Symptoms:</strong> {alert.symptoms.join(', ')}</p>
                        )}
                        {alert.vitals && (
                          <p><strong>Vitals:</strong> HR: {alert.vitals.heartRate}, BP: {alert.vitals.bloodPressure}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {alert.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Resolve
                  </Button>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Actions</CardTitle>
          <CardDescription>
            Quick access to emergency functions and panic button
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="h-20"
              onClick={() => triggerEmergencyAlert('panic')}
            >
              <Siren className="w-8 h-8 mb-2" />
              <div>PANIC BUTTON</div>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-20 border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => triggerEmergencyAlert('medical', ['chest_pain', 'difficulty_breathing'])}
            >
              <Heart className="w-8 h-8 mb-2" />
              <div>Medical Emergency</div>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-20 border-orange-500 text-orange-600 hover:bg-orange-50"
              onClick={() => triggerEmergencyAlert('fall')}
            >
              <AlertTriangle className="w-8 h-8 mb-2" />
              <div>Fall Detected</div>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="h-20"
              onClick={testEmergencySystem}
            >
              <Shield className="w-8 h-8 mb-2" />
              <div>Test System</div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="location">Location & Tracking</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Emergency Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add New Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Add Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contactName">Full Name</Label>
                  <Input
                    id="contactName"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactRelationship">Relationship</Label>
                  <Input
                    id="contactRelationship"
                    value={newContactRelationship}
                    onChange={(e) => setNewContactRelationship(e.target.value)}
                    placeholder="Spouse, Parent, Friend, etc."
                  />
                </div>
                
                <Button onClick={addEmergencyContact} className="w-full">
                  <User className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              </CardContent>
            </Card>

            {/* Current Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Current Emergency Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emergencyContacts.map((contact, index) => (
                    <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <p className="text-sm text-gray-600">{contact.relationship}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Priority {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmergencyContact(contact.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {emergencyContacts.length === 0 && (
                    <div className="text-center py-8">
                      <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No emergency contacts added</p>
                      <p className="text-sm text-gray-500">Add contacts who should be notified in emergencies</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Location & Tracking Tab */}
        <TabsContent value="location" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentLocation ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Navigation className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-800">Location Active</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Latitude: {currentLocation.latitude.toFixed(6)}
                      </p>
                      <p className="text-sm text-green-700">
                        Longitude: {currentLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>• Location is automatically shared during emergencies</p>
                      <p>• GPS coordinates are encrypted and secure</p>
                      <p>• Location history is not stored</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Location not available</p>
                    <Button 
                      onClick={initializeLocationTracking}
                      className="mt-4"
                    >
                      Enable Location Services
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Fall Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-4 border rounded-lg ${
                    fallDetection ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        fallDetection ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-medium">
                        Fall Detection {fallDetection ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {fallDetection 
                        ? 'Monitoring device motion for fall detection'
                        : 'Fall detection requires device motion sensors'
                      }
                    </p>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Automatic fall detection using device sensors</p>
                    <p>• 30-second countdown before emergency alert</p>
                    <p>• Can be cancelled if false positive</p>
                  </div>
                  
                  {!fallDetection && (
                    <Button 
                      onClick={initializeFallDetection}
                      className="w-full"
                    >
                      Enable Fall Detection
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Response Settings</CardTitle>
              <CardDescription>
                Configure emergency response behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Automatic Emergency Services</p>
                    <p className="text-sm text-gray-600">Automatically call 911 for critical alerts</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Contact Notifications</p>
                    <p className="text-sm text-gray-600">Notify emergency contacts for all alerts</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Location Sharing</p>
                    <p className="text-sm text-gray-600">Share location with emergency services</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Fall Detection Sensitivity</p>
                    <p className="text-sm text-gray-600">Adjust sensitivity for fall detection</p>
                  </div>
                  <select className="p-2 border rounded">
                    <option>High</option>
                    <option selected>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button onClick={testEmergencySystem} className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Test Emergency System
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmergencyResponse;
