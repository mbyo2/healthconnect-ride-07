import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCheck, AlertCircle, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DigitalIntakeFormProps {
  appointmentId?: string;
  onComplete?: () => void;
}

interface MedicationEntry { name: string; dosage: string; frequency: string; }
interface AllergyEntry { allergen: string; reaction: string; severity: string; }

export const DigitalIntakeForm = ({ appointmentId, onComplete }: DigitalIntakeFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('medical');

  // Medical history
  const [conditions, setConditions] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');

  // Medications
  const [medications, setMedications] = useState<MedicationEntry[]>([]);

  // Allergies
  const [allergies, setAllergies] = useState<AllergyEntry[]>([]);

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('');

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // Consent
  const [consentSigned, setConsentSigned] = useState(false);

  // Check existing form
  const { data: existingForm } = useQuery({
    queryKey: ['intake-form', appointmentId],
    queryFn: async () => {
      if (!appointmentId || !user) return null;
      const { data } = await supabase
        .from('intake_forms' as any)
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('patient_id', user.id)
        .single();
      return data as any;
    },
    enabled: !!appointmentId && !!user
  });

  const submitForm = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!consentSigned) throw new Error('Please sign the consent form');

      const formData = {
        patient_id: user.id,
        appointment_id: appointmentId || null,
        form_type: 'general',
        status: 'submitted',
        medical_history: { conditions, surgeries, family_history: familyHistory },
        current_medications: medications,
        allergies,
        insurance_info: { provider: insuranceProvider, policy_number: policyNumber, group_number: groupNumber },
        emergency_contact: { name: emergencyName, phone: emergencyPhone, relationship: emergencyRelation },
        consent_signed: true,
        consent_signed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase.from('intake_forms' as any).insert(formData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Intake form submitted! Your provider will review it before your visit.');
      queryClient.invalidateQueries({ queryKey: ['intake-form'] });
      onComplete?.();
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (existingForm?.status === 'submitted') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Intake Form Submitted</h3>
          <p className="text-muted-foreground">Your intake form has been submitted and will be reviewed by your provider.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Digital Intake Form
        </CardTitle>
        <CardDescription>Complete this form before your visit to reduce wait times</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="medications">Meds</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="consent">Consent</TabsTrigger>
          </TabsList>

          <TabsContent value="medical" className="space-y-4 mt-4">
            <div>
              <Label>Current Medical Conditions</Label>
              <Textarea placeholder="e.g., Diabetes, Hypertension..." value={conditions} onChange={e => setConditions(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Past Surgeries / Procedures</Label>
              <Textarea placeholder="List any past surgeries with dates..." value={surgeries} onChange={e => setSurgeries(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Family Medical History</Label>
              <Textarea placeholder="Notable conditions in your family..." value={familyHistory} onChange={e => setFamilyHistory(e.target.value)} rows={3} />
            </div>
            <Button onClick={() => setActiveTab('medications')}>Next: Medications →</Button>
          </TabsContent>

          <TabsContent value="medications" className="space-y-4 mt-4">
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end">
                <div><Label>Name</Label><Input value={med.name} onChange={e => { const m = [...medications]; m[i].name = e.target.value; setMedications(m); }} /></div>
                <div><Label>Dosage</Label><Input value={med.dosage} onChange={e => { const m = [...medications]; m[i].dosage = e.target.value; setMedications(m); }} /></div>
                <div><Label>Frequency</Label><Input value={med.frequency} onChange={e => { const m = [...medications]; m[i].frequency = e.target.value; setMedications(m); }} /></div>
                <Button variant="ghost" size="icon" onClick={() => setMedications(medications.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setMedications([...medications, { name: '', dosage: '', frequency: '' }])}>
              <Plus className="h-4 w-4 mr-1" /> Add Medication
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('medical')}>← Back</Button>
              <Button onClick={() => setActiveTab('allergies')}>Next: Allergies →</Button>
            </div>
          </TabsContent>

          <TabsContent value="allergies" className="space-y-4 mt-4">
            {allergies.map((allergy, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end">
                <div><Label>Allergen</Label><Input value={allergy.allergen} onChange={e => { const a = [...allergies]; a[i].allergen = e.target.value; setAllergies(a); }} /></div>
                <div><Label>Reaction</Label><Input value={allergy.reaction} onChange={e => { const a = [...allergies]; a[i].reaction = e.target.value; setAllergies(a); }} /></div>
                <div>
                  <Label>Severity</Label>
                  <Select value={allergy.severity} onValueChange={v => { const a = [...allergies]; a[i].severity = v; setAllergies(a); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setAllergies(allergies.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setAllergies([...allergies, { allergen: '', reaction: '', severity: 'mild' }])}>
              <Plus className="h-4 w-4 mr-1" /> Add Allergy
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('medications')}>← Back</Button>
              <Button onClick={() => setActiveTab('insurance')}>Next: Insurance →</Button>
            </div>
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4 mt-4">
            <div><Label>Insurance Provider</Label><Input placeholder="e.g., Aetna, Blue Cross..." value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} /></div>
            <div><Label>Policy Number</Label><Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} /></div>
            <div><Label>Group Number (optional)</Label><Input value={groupNumber} onChange={e => setGroupNumber(e.target.value)} /></div>
            <div>
              <Label>Emergency Contact Name</Label>
              <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} /></div>
              <div><Label>Relationship</Label><Input value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('allergies')}>← Back</Button>
              <Button onClick={() => setActiveTab('consent')}>Next: Consent →</Button>
            </div>
          </TabsContent>

          <TabsContent value="consent" className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg bg-muted/50 text-sm space-y-2">
              <h4 className="font-semibold">Consent & Acknowledgment</h4>
              <p>By signing below, I acknowledge that:</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>The information I have provided is accurate and complete to the best of my knowledge.</li>
                <li>I authorize the healthcare provider to access my medical information for the purpose of my care.</li>
                <li>I understand my rights under HIPAA regarding my protected health information.</li>
                <li>I consent to the proposed treatment and understand I may withdraw consent at any time.</li>
              </ul>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="consent" checked={consentSigned} onCheckedChange={(v) => setConsentSigned(v === true)} />
              <Label htmlFor="consent" className="text-sm font-medium">I agree to the above terms and conditions</Label>
            </div>
            {!consentSigned && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                You must sign the consent to submit the form.
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setActiveTab('insurance')}>← Back</Button>
              <Button onClick={() => submitForm.mutate()} disabled={!consentSigned || submitForm.isPending}>
                {submitForm.isPending ? 'Submitting...' : 'Submit Intake Form'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
