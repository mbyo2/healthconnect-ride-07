import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  AlertTriangle, 
  Heart, 
  Brain, 
  Shield, 
  Pill, 
  Zap, 
  Settings,
  Phone,
  MapPin,
  Clock,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

interface EmergencyProtocol {
  id: string;
  protocol_type: string;
  condition_description: string;
  emergency_instructions: string;
  medications_to_avoid: string[];
  emergency_medications: string[];
  special_considerations?: string;
  emergency_contact_ids: string[];
  healthcare_provider_contact?: string;
  is_active: boolean;
  priority_level: number;
}

const protocolTypes = [
  { value: 'medical_emergency', label: 'Medical Emergency', icon: Heart, color: 'text-red-600' },
  { value: 'psychiatric_emergency', label: 'Psychiatric Emergency', icon: Brain, color: 'text-purple-600' },
  { value: 'allergic_reaction', label: 'Allergic Reaction', icon: AlertTriangle, color: 'text-orange-600' },
  { value: 'medication_overdose', label: 'Medication Overdose', icon: Pill, color: 'text-yellow-600' },
  { value: 'cardiac_event', label: 'Cardiac Event', icon: Zap, color: 'text-red-600' },
  { value: 'custom', label: 'Custom Protocol', icon: Settings, color: 'text-blue-600' }
];

const priorityLevels = [
  { value: 1, label: 'Critical', color: 'bg-red-100 text-red-800' },
  { value: 2, label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 3, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 4, label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 5, label: 'Informational', color: 'bg-gray-100 text-gray-800' }
];

export const EmergencyProtocols = () => {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    protocol_type: '',
    condition_description: '',
    emergency_instructions: '',
    medications_to_avoid: [] as string[],
    emergency_medications: [] as string[],
    special_considerations: '',
    emergency_contact_ids: [] as string[],
    healthcare_provider_contact: '',
    is_active: true,
    priority_level: 1
  });

  const [currentMedicationToAvoid, setCurrentMedicationToAvoid] = useState('');
  const [currentEmergencyMedication, setCurrentEmergencyMedication] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch emergency protocols
      const { data: protocolsData, error: protocolsError } = await supabase
        .from('emergency_protocols')
        .select('*')
        .eq('patient_id', user?.id)
        .order('priority_level', { ascending: true });

      if (protocolsError) throw protocolsError;
      setProtocols(protocolsData || []);

      // Fetch emergency contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('patient_id', user?.id)
        .order('is_primary', { ascending: false });

      if (contactsError) throw contactsError;
      setEmergencyContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching emergency data:', error);
      toast.error('Failed to load emergency protocols');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.protocol_type || !formData.condition_description || !formData.emergency_instructions) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('emergency_protocols')
        .insert({
          patient_id: user?.id,
          ...formData
        });

      if (error) throw error;

      toast.success('Emergency protocol created successfully');
      setShowAddForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating emergency protocol:', error);
      toast.error('Failed to create emergency protocol');
    }
  };

  const toggleProtocolStatus = async (protocolId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('emergency_protocols')
        .update({ is_active: !isActive })
        .eq('id', protocolId);

      if (error) throw error;

      toast.success(`Protocol ${!isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating protocol status:', error);
      toast.error('Failed to update protocol status');
    }
  };

  const resetForm = () => {
    setFormData({
      protocol_type: '',
      condition_description: '',
      emergency_instructions: '',
      medications_to_avoid: [],
      emergency_medications: [],
      special_considerations: '',
      emergency_contact_ids: [],
      healthcare_provider_contact: '',
      is_active: true,
      priority_level: 1
    });
    setCurrentMedicationToAvoid('');
    setCurrentEmergencyMedication('');
  };

  const addMedicationToAvoid = () => {
    if (currentMedicationToAvoid.trim()) {
      setFormData(prev => ({
        ...prev,
        medications_to_avoid: [...prev.medications_to_avoid, currentMedicationToAvoid.trim()]
      }));
      setCurrentMedicationToAvoid('');
    }
  };

  const addEmergencyMedication = () => {
    if (currentEmergencyMedication.trim()) {
      setFormData(prev => ({
        ...prev,
        emergency_medications: [...prev.emergency_medications, currentEmergencyMedication.trim()]
      }));
      setCurrentEmergencyMedication('');
    }
  };

  const removeMedicationToAvoid = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medications_to_avoid: prev.medications_to_avoid.filter((_, i) => i !== index)
    }));
  };

  const removeEmergencyMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergency_medications: prev.emergency_medications.filter((_, i) => i !== index)
    }));
  };

  const getProtocolIcon = (type: string) => {
    const protocolType = protocolTypes.find(p => p.value === type);
    const Icon = protocolType?.icon || Settings;
    return <Icon className={cn("h-5 w-5", protocolType?.color)} />;
  };

  const getPriorityBadge = (level: number) => {
    const priority = priorityLevels.find(p => p.value === level);
    return (
      <Badge className={priority?.color}>
        <Star className="h-3 w-3 mr-1" />
        {priority?.label}
      </Badge>
    );
  };

  const getEmergencyContactName = (contactId: string) => {
    const contact = emergencyContacts.find(c => c.id === contactId);
    return contact ? `${contact.name} (${contact.relationship})` : 'Unknown Contact';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Emergency Protocols</h2>
          <p className="text-muted-foreground">Manage emergency procedures and critical health information</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Protocol
        </Button>
      </div>

      {/* Emergency Alert */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-red-800">
          <strong>Important:</strong> In case of a life-threatening emergency, always call 911 immediately. 
          These protocols are for informational purposes and should not replace emergency medical services.
        </AlertDescription>
      </Alert>

      {/* Add Protocol Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Emergency Protocol</CardTitle>
            <CardDescription>Define procedures for specific emergency situations</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocol_type">Protocol Type *</Label>
                  <Select value={formData.protocol_type} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, protocol_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select protocol type" />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={cn("h-4 w-4", type.color)} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority_level">Priority Level</Label>
                  <Select value={formData.priority_level.toString()} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, priority_level: parseInt(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value.toString()}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="condition_description">Condition Description *</Label>
                <Textarea
                  id="condition_description"
                  value={formData.condition_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition_description: e.target.value }))}
                  placeholder="Describe the specific condition or emergency situation"
                  required
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="emergency_instructions">Emergency Instructions *</Label>
                <Textarea
                  id="emergency_instructions"
                  value={formData.emergency_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_instructions: e.target.value }))}
                  placeholder="Step-by-step instructions for this emergency"
                  required
                  rows={4}
                />
              </div>

              {/* Medications to Avoid */}
              <div>
                <Label>Medications to Avoid</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentMedicationToAvoid}
                    onChange={(e) => setCurrentMedicationToAvoid(e.target.value)}
                    placeholder="Add medication to avoid"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicationToAvoid())}
                  />
                  <Button type="button" onClick={addMedicationToAvoid} size="sm">
                    Add
                  </Button>
                </div>
                {formData.medications_to_avoid.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.medications_to_avoid.map((med, index) => (
                      <Badge key={index} variant="destructive" className="cursor-pointer" 
                             onClick={() => removeMedicationToAvoid(index)}>
                        {med} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Emergency Medications */}
              <div>
                <Label>Emergency Medications</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={currentEmergencyMedication}
                    onChange={(e) => setCurrentEmergencyMedication(e.target.value)}
                    placeholder="Add emergency medication"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmergencyMedication())}
                  />
                  <Button type="button" onClick={addEmergencyMedication} size="sm">
                    Add
                  </Button>
                </div>
                {formData.emergency_medications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.emergency_medications.map((med, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" 
                             onClick={() => removeEmergencyMedication(index)}>
                        {med} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="special_considerations">Special Considerations</Label>
                <Textarea
                  id="special_considerations"
                  value={formData.special_considerations}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_considerations: e.target.value }))}
                  placeholder="Any special considerations or additional information"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="healthcare_provider_contact">Healthcare Provider Contact</Label>
                <Input
                  id="healthcare_provider_contact"
                  value={formData.healthcare_provider_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthcare_provider_contact: e.target.value }))}
                  placeholder="Primary doctor's contact information"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active Protocol</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Protocol
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Protocols List */}
      <div className="space-y-4">
        {protocols.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Emergency Protocols</h3>
              <p className="text-muted-foreground mb-4">
                Create emergency protocols to prepare for critical situations
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Protocol
              </Button>
            </CardContent>
          </Card>
        ) : (
          protocols.map((protocol) => (
            <Card key={protocol.id} className={cn(
              "border-l-4",
              protocol.priority_level === 1 && "border-l-red-500",
              protocol.priority_level === 2 && "border-l-orange-500",
              protocol.priority_level === 3 && "border-l-yellow-500",
              protocol.priority_level === 4 && "border-l-blue-500",
              protocol.priority_level === 5 && "border-l-gray-500",
              !protocol.is_active && "opacity-60"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getProtocolIcon(protocol.protocol_type)}
                    <div>
                      <CardTitle className="text-lg">
                        {protocolTypes.find(t => t.value === protocol.protocol_type)?.label}
                      </CardTitle>
                      <CardDescription>
                        {protocol.condition_description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getPriorityBadge(protocol.priority_level)}
                    <Badge variant={protocol.is_active ? "default" : "secondary"}>
                      {protocol.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emergency Instructions */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Emergency Instructions
                  </h4>
                  <p className="text-sm leading-relaxed bg-red-50 p-3 rounded-lg border border-red-200">
                    {protocol.emergency_instructions}
                  </p>
                </div>

                {/* Medications */}
                {(protocol.medications_to_avoid.length > 0 || protocol.emergency_medications.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {protocol.medications_to_avoid.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-red-600">Medications to Avoid</h4>
                        <div className="flex flex-wrap gap-1">
                          {protocol.medications_to_avoid.map((med, index) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {med}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {protocol.emergency_medications.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-green-600">Emergency Medications</h4>
                        <div className="flex flex-wrap gap-1">
                          {protocol.emergency_medications.map((med, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {med}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Special Considerations */}
                {protocol.special_considerations && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Special Considerations</h4>
                    <p className="text-sm text-muted-foreground">{protocol.special_considerations}</p>
                  </div>
                )}

                {/* Healthcare Provider Contact */}
                {protocol.healthcare_provider_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Healthcare Provider:</span>
                    <span>{protocol.healthcare_provider_contact}</span>
                  </div>
                )}

                {/* Emergency Contacts */}
                {protocol.emergency_contact_ids.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Emergency Contacts</h4>
                    <div className="space-y-1">
                      {protocol.emergency_contact_ids.map((contactId, index) => (
                        <p key={index} className="text-sm text-muted-foreground">
                          {getEmergencyContactName(contactId)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => toggleProtocolStatus(protocol.id, protocol.is_active)}
                  >
                    {protocol.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};