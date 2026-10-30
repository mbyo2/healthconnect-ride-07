import React, { useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useHospitalPatients } from '@/hooks/useHospitalPatients';
import { HospitalPatientSelect } from '@/components/hospital/HospitalPatientSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Calendar, Users, FileText, Settings, ClipboardList, MessageSquare,
  Brain, Wallet, AlertTriangle, Video, Activity, Baby, Heart
} from 'lucide-react';
import { friendlyErrorMessage } from '@/utils/friendly-error';

export const MidwifeWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated, institutionId } = useInstitutionAffiliation();
  const [showANC, setShowANC] = useState(false);
  const [ancPatientId, setAncPatientId] = useState('');
  const { patients: ancPatients } = useHospitalPatients(institutionId);
  const [savingANC, setSavingANC] = useState(false);
  const [anc, setAnc] = useState({
    gestationalAge: '', fundalHeight: '', fetalHeartRate: '', bp: '',
    weight: '', urineProtein: '', hemoglobin: '', notes: ''
  });

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const saveANC = async () => {
    if (!ancPatientId) { toast.error('Select a patient for this ANC visit'); return; }
    if (!institutionId) { toast.error('No institution selected'); return; }
    // Parse BP "110/70" into systolic/diastolic
    const bpMatch = anc.bp.match(/(\d+)\s*\/\s*(\d+)/);
    const numOrNull = (v: string) => { const n = Number(v); return v.trim() !== '' && Number.isFinite(n) ? n : null; };
    setSavingANC(true);
    try {
      const { error } = await supabase.from('anc_visits').insert({
        institution_id: institutionId,
        patient_id: ancPatientId,
        visit_date: new Date().toISOString().split('T')[0],
        gestational_age_weeks: numOrNull(anc.gestationalAge),
        weight_kg: numOrNull(anc.weight),
        bp_systolic: bpMatch ? parseInt(bpMatch[1], 10) : null,
        bp_diastolic: bpMatch ? parseInt(bpMatch[2], 10) : null,
        hemoglobin: numOrNull(anc.hemoglobin),
        urine_protein: anc.urineProtein || null,
        fetal_heart_rate: numOrNull(anc.fetalHeartRate),
        notes: [anc.fundalHeight ? `Fundal height: ${anc.fundalHeight}cm` : null, anc.notes || null].filter(Boolean).join(' | ') || null,
      });
      if (error) throw error;
      showSuccess({ message: 'Antenatal visit recorded' });
      setShowANC(false);
      setAncPatientId('');
      setAnc({ gestationalAge: '', fundalHeight: '', fetalHeartRate: '', bp: '', weight: '', urineProtein: '', hemoglobin: '', notes: '' });
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, 'Failed to save ANC visit'));
    } finally {
      setSavingANC(false);
    }
  };

  const workflowSteps = [
    { title: "Antenatal Care", description: "ANC visits, fetal monitoring", icon: <Baby className="h-5 w-5" />, action: () => setShowANC(!showANC) },
    { title: "My Schedule", description: "Availability, appointments & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's consultations", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records (EMR)", description: "Maternal & child health records", icon: <Heart className="h-5 w-5" />, route: '/institution/patients' },
    { title: "Write Prescriptions", description: "Digital Rx with safety alerts", icon: <FileText className="h-5 w-5" />, route: '/prescriptions' },
    { title: "Record Vitals", description: "Maternal vitals & measurements", icon: <Activity className="h-5 w-5" />, route: '/institution/patients' },
    { title: "AI Clinical Assistant", description: "AI-powered support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Video Consultations", description: "Telemedicine", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected mothers", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Emergency Protocols", description: "Obstetric emergencies", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  const ancField = (label: string, key: keyof typeof anc, placeholder: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={anc[key]} onChange={e => setAnc({ ...anc, [key]: e.target.value })} placeholder={placeholder} className="mt-1" />
    </div>
  );

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-bold shadow-md">
            <Baby className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Midwife Clinical Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">Maternal Health Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">Antenatal care, deliveries, postnatal care & maternal health</p>
          </div>
        </div>
      </div>

      {showANC && (
        <Card className="border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary-500" />
              Antenatal Visit Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <HospitalPatientSelect
                institutionId={institutionId}
                patients={ancPatients}
                value={ancPatientId}
                onChange={setAncPatientId}
                label="Patient *"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ancField('Gestational Age (weeks)', 'gestationalAge', '28')}
              {ancField('Fundal Height (cm)', 'fundalHeight', '26')}
              {ancField('Fetal Heart Rate (bpm)', 'fetalHeartRate', '140')}
              {ancField('Blood Pressure', 'bp', '110/70')}
              {ancField('Weight (kg)', 'weight', '65')}
              {ancField('Urine Protein', 'urineProtein', 'Negative')}
              {ancField('Hemoglobin (g/dL)', 'hemoglobin', '11.5')}
            </div>
            <div>
              <Label className="text-xs">Visit Notes</Label>
              <Input value={anc.notes} onChange={e => setAnc({ ...anc, notes: e.target.value })} placeholder="Findings, advice given, next appointment..." className="mt-1" />
            </div>
            <Button onClick={saveANC} disabled={savingANC} className="w-full min-h-[44px]">
              {savingANC ? 'Saving…' : 'Save ANC Visit'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <div
            key={index}
            className="group cursor-pointer rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-primary-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation flex flex-col justify-between"
            onClick={() => step.action ? step.action() : handleNavigation(step.route!, step.title)}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary-50 dark:bg-blue-950/60 text-primary-500 dark:text-blue-400 rounded-xl shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                {step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">{step.title}</h3>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">{step.description}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); step.action ? step.action() : handleNavigation(step.route!, step.title); }}
              className="w-full mt-2 py-1.5 rounded-xl bg-canvas-bone dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-500 group-hover:text-white text-xs font-bold transition-all"
            >
              Open Module
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
