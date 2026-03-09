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
import { toast } from 'sonner';
import { AlertTriangle, Heart, Activity, Thermometer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TriageFormProps {
  institutionId: string;
  patientId: string;
  patientName: string;
  onComplete?: () => void;
}

// Using the existing triage_level enum: critical, urgent, standard, non_urgent
const triageLevels = [
  { level: 'critical', label: 'Critical', description: 'Immediate life-saving intervention required', color: 'bg-destructive' },
  { level: 'urgent', label: 'Urgent', description: 'High risk situation, severe pain', color: 'bg-orange-500' },
  { level: 'standard', label: 'Standard', description: 'Moderate urgency, resources needed', color: 'bg-yellow-500' },
  { level: 'non_urgent', label: 'Non-Urgent', description: 'Can wait, minimal resources needed', color: 'bg-primary' },
];

type TriageLevel = 'critical' | 'urgent' | 'standard' | 'non_urgent';

export const TriageAssessmentForm: React.FC<TriageFormProps> = ({ institutionId, patientId, patientName, onComplete }) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    triageLevel: 'standard' as TriageLevel,
    chiefComplaint: '',
    temperature: '',
    bpSystolic: '',
    bpDiastolic: '',
    heartRate: '',
    respiratoryRate: '',
    spo2: '',
    painLevel: '',
    consciousnessLevel: 'alert',
    mobility: 'ambulatory',
    bleeding: false,
    allergies: '',
    currentMedications: '',
    disposition: '',
    assessmentNotes: '',
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
      };

      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('triage_assessments')
        .insert([{
          patient_id: patientId || null,
          institution_id: institutionId,
          patient_name: patientName,
          triage_level: formData.triageLevel as 'emergency' | 'urgent' | 'standard' | 'non_urgent',
          chief_complaint: formData.chiefComplaint,
          vital_signs: vitalSigns,
          pain_level: parseInt(formData.painLevel) || null,
          consciousness_level: formData.consciousnessLevel,
          mobility: formData.mobility,
          bleeding: formData.bleeding,
          allergies: formData.allergies || null,
          current_medications: formData.currentMedications || null,
          disposition: formData.disposition || null,
          assessment_notes: formData.assessmentNotes || null,
          assessed_by: user.id,
          assessed_at: new Date().toISOString(),
        }]);

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

  const calculateTriageLevel = () => {
    let suggestedLevel: 'emergency' | 'urgent' | 'standard' | 'non_urgent' = 'non_urgent';

    // Check for emergency conditions
    if (formData.consciousnessLevel === 'unresponsive' || formData.bleeding) {
      suggestedLevel = 'emergency';
    }
    // Check for urgent conditions
    else if (
      formData.consciousnessLevel !== 'alert' ||
      parseInt(formData.painLevel) >= 8
    ) {
      suggestedLevel = 'urgent';
    }
    // Standard if moderate pain or mobility issues
    else if (parseInt(formData.painLevel) >= 5 || formData.mobility !== 'ambulatory') {
      suggestedLevel = 'standard';
    }

    setFormData(prev => ({ ...prev, triageLevel: suggestedLevel }));
    toast.info(`Suggested Triage Level: ${suggestedLevel}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Emergency Triage Assessment
        </CardTitle>
        <CardDescription>
          Triage assessment for: {patientName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Triage Level Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Triage Level</Label>
            <Button type="button" variant="outline" size="sm" onClick={calculateTriageLevel}>
              Calculate Level
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {triageLevels.map((triage) => (
              <button
                key={triage.level}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, triageLevel: triage.level as typeof prev.triageLevel }))}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all text-white',
                  triage.color,
                  formData.triageLevel === triage.level ? 'ring-2 ring-offset-2 ring-ring' : 'opacity-60 hover:opacity-100'
                )}
              >
                <div className="text-sm font-bold">{triage.label}</div>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {triageLevels.find(e => e.level === formData.triageLevel)?.description}
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

        {/* Clinical Assessment */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">Clinical Assessment</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Consciousness Level</Label>
              <Select
                value={formData.consciousnessLevel}
                onValueChange={(v) => setFormData(prev => ({ ...prev, consciousnessLevel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="verbal">Responds to Verbal</SelectItem>
                  <SelectItem value="pain">Responds to Pain</SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mobility</Label>
              <Select
                value={formData.mobility}
                onValueChange={(v) => setFormData(prev => ({ ...prev, mobility: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambulatory">Ambulatory</SelectItem>
                  <SelectItem value="assisted">Assisted</SelectItem>
                  <SelectItem value="wheelchair">Wheelchair</SelectItem>
                  <SelectItem value="stretcher">Stretcher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="bleeding"
                checked={formData.bleeding}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bleeding: !!checked }))}
              />
              <Label htmlFor="bleeding" className="text-destructive font-medium">Active Bleeding</Label>
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Input
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="e.g., Penicillin, Sulfa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentMedications">Current Medications</Label>
            <Input
              id="currentMedications"
              value={formData.currentMedications}
              onChange={(e) => setFormData(prev => ({ ...prev, currentMedications: e.target.value }))}
              placeholder="e.g., Metformin, Lisinopril"
            />
          </div>
        </div>

        {/* Disposition */}
        <div className="space-y-2">
          <Label htmlFor="disposition">Disposition</Label>
          <Select
            value={formData.disposition}
            onValueChange={(v) => setFormData(prev => ({ ...prev, disposition: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select disposition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="emergency">Emergency Department</SelectItem>
              <SelectItem value="urgent_care">Urgent Care</SelectItem>
              <SelectItem value="outpatient">Outpatient Clinic</SelectItem>
              <SelectItem value="admission">Direct Admission</SelectItem>
              <SelectItem value="observation">Observation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="assessmentNotes">Assessment Notes</Label>
          <Textarea
            id="assessmentNotes"
            value={formData.assessmentNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, assessmentNotes: e.target.value }))}
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
