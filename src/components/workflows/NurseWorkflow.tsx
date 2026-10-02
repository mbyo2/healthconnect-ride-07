import React, { useState, useEffect } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Heart, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Wallet, AlertTriangle,
  Activity, Thermometer, Home, Pill, Stethoscope,
  Shield, Bug, Video, Megaphone, Code2, Bell, CreditCard
} from 'lucide-react';

export const NurseWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const { user } = useAuth();

  // Structured vitals entry (previously "coming soon").
  const [showVitals, setShowVitals] = useState(false);
  const [vitalsPatientId, setVitalsPatientId] = useState('');
  const [vitalsPatients, setVitalsPatients] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [vitals, setVitals] = useState({ sys: '', dia: '', hr: '', temp: '', spo2: '', rr: '', glucose: '', weight: '' });
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);

  useEffect(() => {
    if (!showVitals) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'patient')
        .order('last_name')
        .limit(200);
      setVitalsPatients(data ?? []);
    })();
  }, [showVitals]);

  const numOrNull = (v: string) => {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) ? n : null;
  };

  const saveVitals = async () => {
    if (!vitalsPatientId) { toast.error('Select a patient'); return; }
    if (!user) { toast.error('You must be signed in'); return; }
    const payload = {
      user_id: vitalsPatientId,
      blood_pressure_systolic: numOrNull(vitals.sys),
      blood_pressure_diastolic: numOrNull(vitals.dia),
      heart_rate: numOrNull(vitals.hr),
      temperature: numOrNull(vitals.temp),
      oxygen_saturation: numOrNull(vitals.spo2),
      respiratory_rate: numOrNull(vitals.rr),
      blood_glucose: numOrNull(vitals.glucose),
      weight: numOrNull(vitals.weight),
      recorded_at: new Date().toISOString(),
      metadata: { recorded_by: user.id, notes: vitalsNotes || null },
    };
    const hasAny = [payload.blood_pressure_systolic, payload.blood_pressure_diastolic,
      payload.heart_rate, payload.temperature, payload.oxygen_saturation,
      payload.respiratory_rate, payload.blood_glucose, payload.weight]
      .some(v => v !== null);
    if (!hasAny) { toast.error('Enter at least one vital sign'); return; }
    setSavingVitals(true);
    try {
      const { error } = await supabase.from('vital_signs').insert(payload);
      if (error) throw error;
      // Mirror into comprehensive_health_metrics so the patient can see
      // provider-recorded vitals in their own app (MedicalRecords reads that
      // table, not vital_signs). Best-effort: a mirror failure must not roll
      // back the clinical record.
      try {
        const recordedAt = payload.recorded_at as string;
        const mirrorRows = [
          { name: 'Blood Pressure (Systolic)', value: payload.blood_pressure_systolic, unit: 'mmHg' },
          { name: 'Blood Pressure (Diastolic)', value: payload.blood_pressure_diastolic, unit: 'mmHg' },
          { name: 'Heart Rate', value: payload.heart_rate, unit: 'bpm' },
          { name: 'Temperature', value: payload.temperature, unit: '°C' },
          { name: 'Oxygen Saturation', value: payload.oxygen_saturation, unit: '%' },
          { name: 'Respiratory Rate', value: payload.respiratory_rate, unit: '/min' },
          { name: 'Blood Glucose', value: payload.blood_glucose, unit: 'mmol/L' },
          { name: 'Weight', value: payload.weight, unit: 'kg' },
        ].filter(r => r.value !== null).map(r => ({
          user_id: vitalsPatientId,
          metric_category: 'vital_signs',
          metric_name: r.name,
          value: r.value,
          unit: r.unit,
          recorded_at: recordedAt,
          recorded_by: user.id,
          is_patient_entered: false,
          notes: vitalsNotes || null,
          status: 'normal',
        }));
        if (mirrorRows.length > 0) {
          const { error: mirrorError } = await supabase.from('comprehensive_health_metrics').insert(mirrorRows);
          if (mirrorError) console.warn('Vitals metrics mirror failed:', mirrorError.message);
        }
      } catch (mirrorErr) {
        console.warn('Vitals metrics mirror failed:', mirrorErr);
      }
      showSuccess({ message: 'Vitals recorded successfully' });
      setShowVitals(false);
      setVitals({ sys: '', dia: '', hr: '', temp: '', spo2: '', rr: '', glucose: '', weight: '' });
      setVitalsNotes('');
      setVitalsPatientId('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record vitals');
    } finally {
      setSavingVitals(false);
    }
  };
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const handleStepClick = (step: { route?: string; action?: () => void; title: string }) => {
    if (step.action) { step.action(); return; }
    if (step.route) handleNavigation(step.route, step.title);
  };

  const workflowSteps = [
    { title: "My Schedule", description: "Appointments, home visits & shift calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Appointments", description: "Today's consultations and upcoming visits", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Vitals", description: "Record BP, temperature, pulse & vitals", icon: <Thermometer className="h-5 w-5" />, action: () => setShowVitals(!showVitals) },
    { title: "Care Plans", description: "Create and manage patient care plans", icon: <Heart className="h-5 w-5" />, route: '/medical-records' },
    { title: "Allergy Alerts", description: "Patient allergy checks before administration", icon: <Shield className="h-5 w-5" />, route: '/medical-records' },
    { title: "Infection Control", description: "Infection tracking & preventive protocols", icon: <Bug className="h-5 w-5" />, route: '/medical-records' },
    { title: "Home Visit Notes", description: "Document home visit findings & follow-ups", icon: <Home className="h-5 w-5" />, route: '/medical-records' },
    { title: "Medication Administration", description: "Track medication schedules & administration", icon: <Pill className="h-5 w-5" />, route: '/medications' },
    { title: "Wound & Procedure Log", description: "Document wound care, injections & procedures", icon: <Activity className="h-5 w-5" />, route: '/medical-records' },
    { title: "Discharge Checklists", description: "Nursing clearance for patient discharge", icon: <ClipboardList className="h-5 w-5" />, route: '/medical-records' },
    { title: "IoT Vitals Monitor", description: "Real-time device vitals streaming", icon: <Activity className="h-5 w-5" />, route: '/iot-monitoring' },
    { title: "Video Consultations", description: "Telemedicine & remote nursing care", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Your connected patient network", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging with patients & doctors", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "View consultation revenue and payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Emergency Protocols", description: "Emergency response & first aid tools", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Promote Practice", description: "Sponsored listings & growth tools", icon: <Megaphone className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Booking Widget", description: "Embed booking on your website", icon: <Code2 className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Patient Waitlist", description: "Manage waitlisted patients", icon: <Bell className="h-5 w-5" />, route: '/provider-dashboard' },
    { title: "Appointment Reminders", description: "Automated SMS/email reminders", icon: <Bell className="h-5 w-5" />, route: '/appointments' },
    { title: "Insurance Verification", description: "Verify patient insurance cards", icon: <CreditCard className="h-5 w-5" />, route: '/appointments' },
    { title: "Professional Profile", description: "Nursing credentials & certifications", icon: <Stethoscope className="h-5 w-5" />, route: '/profile' },
    { title: "Settings", description: "Consultation & practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Nurse Consultant Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your nursing practice, patient care, and home visits
        </p>
      </div>

      {showVitals && (
        <Card className="border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-primary-500" />
              Record Patient Vitals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-[11px]">Patient *</Label>
              <select
                value={vitalsPatientId}
                onChange={e => setVitalsPatientId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-sm"
              >
                <option value="">Select patient…</option>
                {vitalsPatients.map(p => (
                  <option key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px]">BP Systolic (mmHg)</Label>
                <input type="number" min={50} max={300} value={vitals.sys}
                  onChange={e => setVitals({ ...vitals, sys: e.target.value })}
                  placeholder="120" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">BP Diastolic (mmHg)</Label>
                <input type="number" min={30} max={200} value={vitals.dia}
                  onChange={e => setVitals({ ...vitals, dia: e.target.value })}
                  placeholder="80" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">Heart Rate (bpm)</Label>
                <input type="number" min={20} max={250} value={vitals.hr}
                  onChange={e => setVitals({ ...vitals, hr: e.target.value })}
                  placeholder="72" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">Temperature (°C)</Label>
                <input type="number" step="0.1" min={30} max={45} value={vitals.temp}
                  onChange={e => setVitals({ ...vitals, temp: e.target.value })}
                  placeholder="36.6" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">SpO₂ (%)</Label>
                <input type="number" min={50} max={100} value={vitals.spo2}
                  onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                  placeholder="98" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">Resp. Rate (/min)</Label>
                <input type="number" min={5} max={60} value={vitals.rr}
                  onChange={e => setVitals({ ...vitals, rr: e.target.value })}
                  placeholder="16" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">Glucose (mmol/L)</Label>
                <input type="number" step="0.1" min={1} max={40} value={vitals.glucose}
                  onChange={e => setVitals({ ...vitals, glucose: e.target.value })}
                  placeholder="5.5" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
              <div>
                <Label className="text-[11px]">Weight (kg)</Label>
                <input type="number" step="0.1" min={1} max={400} value={vitals.weight}
                  onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                  placeholder="70" className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold" />
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Notes</Label>
              <Textarea value={vitalsNotes} onChange={e => setVitalsNotes(e.target.value)}
                placeholder="Observation notes…" rows={2} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveVitals} className="flex-1" disabled={savingVitals}>
                {savingVitals ? 'Saving…' : 'Save Vitals'}
              </Button>
              <Button onClick={() => setShowVitals(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleStepClick(step)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button 
                onClick={(e) => { e.stopPropagation(); handleStepClick(step); }}
                size="sm" className="w-full text-xs mt-2">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
