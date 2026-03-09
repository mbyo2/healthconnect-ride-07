import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, Heart, Activity, Thermometer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriageFormProps {
  institutionId: string;
  patientId: string;
  onComplete?: () => void;
}

const esiLevels = [
  { level: 1, label: 'Resuscitation', description: 'Immediate life-saving intervention required', color: 'bg-red-600' },
  { level: 2, label: 'Emergent', description: 'High risk situation, confused/lethargic, severe pain', color: 'bg-orange-500' },
  { level: 3, label: 'Urgent', description: 'Two or more resources needed', color: 'bg-yellow-500' },
  { level: 4, label: 'Less Urgent', description: 'One resource needed', color: 'bg-green-500' },
  { level: 5, label: 'Non-Urgent', description: 'No resources needed', color: 'bg-blue-500' },
];

export const TriageAssessmentForm: React.FC<TriageFormProps> = ({ institutionId, patientId, onComplete }) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    esiLevel: 3,
    chiefComplaint: '',
    onsetTime: '',
    temperature: '',
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    spo2: '',
    painLevel: '',
    mentalStatus: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'normal',
    circulationStatus: 'normal',
    resourcesPredicted: 0,
    isPregnant: false,
    isImmunocompromised: false,
    isHighRisk: false,
    allergies: '',
    currentMedications: '',
    assignedDepartment: '',
    notes: '',
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const vitalSigns = {
        temperature: parseFloat(formData.temperature) || null,
        blood_pressure_systolic: parseInt(formData.bpSystolic) || null,
        blood_pressure_diastolic: parseInt(formData.bpDiastolic) || null,
        heart_rate: parseInt(formData.heartRate) || null,
        respiratory_rate: parseInt(formData.respiratoryRate) || null,
        spo2: parseInt(formData.spo2) || null,
        pain_level: parseInt(formData.painLevel) || null,
      };

      const { error } = await supabase
        .from('triage_assessments')
        .insert({
          patient_id: patientId,
          institution_id: institutionId,
          esi_level: formData.esiLevel,
          chief_complaint: formData.chiefComplaint,
          onset_time: formData.onsetTime || null,
          vital_signs: vitalSigns,
          mental_status: formData.mentalStatus,
          airway_status: formData.airwayStatus,
          breathing_status: formData.breathingStatus,
          circulation_status: formData.circulationStatus,
          resources_predicted: formData.resourcesPredicted,
          is_pregnant: formData.isPregnant,
          is_immunocompromised: formData.isImmunocompromised,
          is_high_risk: formData.isHighRisk,
          allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : null,
          current_medications: formData.currentMedications ? formData.currentMedications.split(',').map(m => m.trim()) : null,
          assigned_department: formData.assignedDepartment || null,
          notes: formData.notes || null,
          triaged_by: user?.id,
          status: 'waiting',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-assessments'] });
      toast.success('Triage assessment completed');
      onComplete?.();
    },
    onError: (error) => {
      toast.error('Failed to submit triage assessment');
      console.error(error);
    },
  });

  const calculateESI = () => {
    // Basic ESI calculation logic
    let suggestedLevel = 5;

    // Check for immediate life threats (ESI 1)
    if (formData.airwayStatus === 'compromised' || formData.breathingStatus === 'absent') {
      suggestedLevel = 1;
    }
    // Check for high-risk (ESI 2)
    else if (
      formData.mentalStatus !== 'alert' ||
      formData.circulationStatus === 'shock' ||
      parseInt(formData.painLevel) >= 8
    ) {
      suggestedLevel = 2;
    }
    // Check resources (ESI 3-5)
    else if (formData.resourcesPredicted >= 2) {
      suggestedLevel = 3;
    } else if (formData.resourcesPredicted === 1) {
      suggestedLevel = 4;
    }

    // High-risk modifiers
    if (formData.isHighRisk || formData.isImmunocompromised) {
      suggestedLevel = Math.min(suggestedLevel, 3);
    }

    setFormData(prev => ({ ...prev, esiLevel: suggestedLevel }));
    toast.info(`Suggested ESI Level: ${suggestedLevel}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Emergency Triage Assessment
        </CardTitle>
        <CardDescription>
          Emergency Severity Index (ESI) triage protocol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ESI Level Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">ESI Level</Label>
            <Button type="button" variant="outline" size="sm" onClick={calculateESI}>
              Calculate ESI
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {esiLevels.map((esi) => (
              <button
                key={esi.level}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, esiLevel: esi.level }))}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-white',
                  esi.color,
                  formData.esiLevel === esi.level ? 'ring-2 ring-offset-2 ring-primary' : 'opacity-60 hover:opacity-100'
                )}
              >
                <div className="text-2xl font-bold">{esi.level}</div>
                <div className="text-xs">{esi.label}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {esiLevels.find(e => e.level === formData.esiLevel)?.description}
          </p>
        </div>

        {/* Chief Complaint */}
        <div className="space-y-2">
          <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
          <Textarea
            id="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
            placeholder="Describe the patient's main complaint..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="onsetTime">Onset Time</Label>
            <Input
              id="onsetTime"
              value={formData.onsetTime}
              onChange={(e) => setFormData(prev => ({ ...prev, onsetTime: e.target.value }))}
              placeholder="e.g., 2 hours ago"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resourcesPredicted">Resources Predicted</Label>
            <Select
              value={formData.resourcesPredicted.toString()}
              onValueChange={(v) => setFormData(prev => ({ ...prev, resourcesPredicted: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">One</SelectItem>
                <SelectItem value="2">Two or more</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vital Signs */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vital Signs
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature" className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" /> Temp (°C)
              </Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                placeholder="37.0"
              />
            </div>
            <div className="space-y-2">
              <Label>BP (mmHg)</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  value={formData.bpSystolic}
                  onChange={(e) => setFormData(prev => ({ ...prev, bpSystolic: e.target.value }))}
                  placeholder="120"
                />
                <span className="self-center">/</span>
                <Input
                  type="number"
                  value={formData.bpDiastolic}
                  onChange={(e) => setFormData(prev => ({ ...prev, bpDiastolic: e.target.value }))}
                  placeholder="80"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartRate" className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> HR (bpm)
              </Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) => setFormData(prev => ({ ...prev, heartRate: e.target.value }))}
                placeholder="72"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">RR (breaths/min)</Label>
              <Input
                id="respiratoryRate"
                type="number"
                value={formData.respiratoryRate}
                onChange={(e) => setFormData(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                placeholder="16"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spo2">SpO2 (%)</Label>
              <Input
                id="spo2"
                type="number"
                value={formData.spo2}
                onChange={(e) => setFormData(prev => ({ ...prev, spo2: e.target.value }))}
                placeholder="98"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="painLevel">Pain (0-10)</Label>
              <Input
                id="painLevel"
                type="number"
                min="0"
                max="10"
                value={formData.painLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, painLevel: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Primary Assessment */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">Primary Assessment (AVPU / ABC)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Mental Status</Label>
              <Select
                value={formData.mentalStatus}
                onValueChange={(v) => setFormData(prev => ({ ...prev, mentalStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                  <SelectItem value="pain">Pain</SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Airway</Label>
              <Select
                value={formData.airwayStatus}
                onValueChange={(v) => setFormData(prev => ({ ...prev, airwayStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patent">Patent</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="compromised">Compromised</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Breathing</Label>
              <Select
                value={formData.breathingStatus}
                onValueChange={(v) => setFormData(prev => ({ ...prev, breathingStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="labored">Labored</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Circulation</Label>
              <Select
                value={formData.circulationStatus}
                onValueChange={(v) => setFormData(prev => ({ ...prev, circulationStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="abnormal">Abnormal</SelectItem>
                  <SelectItem value="shock">Shock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">Risk Factors</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPregnant"
                checked={formData.isPregnant}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPregnant: !!checked }))}
              />
              <Label htmlFor="isPregnant">Pregnant</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isImmunocompromised"
                checked={formData.isImmunocompromised}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isImmunocompromised: !!checked }))}
              />
              <Label htmlFor="isImmunocompromised">Immunocompromised</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isHighRisk"
                checked={formData.isHighRisk}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isHighRisk: !!checked }))}
              />
              <Label htmlFor="isHighRisk">High Risk</Label>
            </div>
          </div>
        </div>

        {/* Allergies & Medications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies (comma-separated)</Label>
            <Input
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="e.g., Penicillin, Sulfa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentMedications">Current Medications (comma-separated)</Label>
            <Input
              id="currentMedications"
              value={formData.currentMedications}
              onChange={(e) => setFormData(prev => ({ ...prev, currentMedications: e.target.value }))}
              placeholder="e.g., Metformin, Lisinopril"
            />
          </div>
        </div>

        {/* Assignment */}
        <div className="space-y-2">
          <Label htmlFor="assignedDepartment">Assign to Department</Label>
          <Select
            value={formData.assignedDepartment}
            onValueChange={(v) => setFormData(prev => ({ ...prev, assignedDepartment: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="icu">ICU</SelectItem>
              <SelectItem value="general_medicine">General Medicine</SelectItem>
              <SelectItem value="surgery">Surgery</SelectItem>
              <SelectItem value="pediatrics">Pediatrics</SelectItem>
              <SelectItem value="obstetrics">Obstetrics</SelectItem>
              <SelectItem value="cardiology">Cardiology</SelectItem>
              <SelectItem value="orthopedics">Orthopedics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional observations or notes..."
          />
        </div>

        {/* Submit */}
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !formData.chiefComplaint}
          className="w-full"
          size="lg"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          Complete Triage Assessment
        </Button>
      </CardContent>
    </Card>
  );
};

export default TriageAssessmentForm;
