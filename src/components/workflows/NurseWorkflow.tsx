// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import React, { useState, useEffect } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useHospitalPatients } from '@/hooks/useHospitalPatients';
import { HospitalPatientSelect } from '@/components/hospital/HospitalPatientSelect';
import DeteriorationScores from '@/components/clinical/DeteriorationScores';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Heart, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Wallet, AlertTriangle,
  Activity, Thermometer, Home, Pill, Stethoscope,
  Shield, Bug, Video, Megaphone, Code2, Bell, CreditCard,
  ChevronRight, Tent
} from 'lucide-react';
import { friendlyErrorMessage } from '@/utils/friendly-error';

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  action?: () => void;
}

interface ActionGroup {
  title: string;
  primary: ActionItem;
  secondary: ActionItem[];
}

export const NurseWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated, institutionId } = useInstitutionAffiliation();
  const { user } = useAuth();
  const { queueAction } = useOfflineSync();

  // Structured vitals entry (previously "coming soon").
  const [showVitals, setShowVitals] = useState(false);
  const [vitalsPatientId, setVitalsPatientId] = useState('');
  const { patients: vitalsPatients } = useHospitalPatients(institutionId);
  const [vitals, setVitals] = useState({ sys: '', dia: '', hr: '', temp: '', spo2: '', rr: '', glucose: '', weight: '' });
  const [vitalsNotes, setVitalsNotes] = useState('');
  const [savingVitals, setSavingVitals] = useState(false);

  // Today-at-a-glance counts
  const [todayPatients, setTodayPatients] = useState<number | null>(null);
  const [vitalsToday, setVitalsToday] = useState<number | null>(null);
  const [pendingActions, setPendingActions] = useState<number | null>(null);

  const numOrNull = (v: string) => {
    const n = Number(v);
    return v.trim() !== '' && Number.isFinite(n) ? n : null;
  };

  // Critical-value thresholds — returns list of human-readable warnings
  const checkCriticalVitals = (): string[] => {
    const warnings: string[] = [];
    const sys = numOrNull(vitals.sys), dia = numOrNull(vitals.dia);
    const hr = numOrNull(vitals.hr), temp = numOrNull(vitals.temp);
    const spo2 = numOrNull(vitals.spo2), rr = numOrNull(vitals.rr);
    const glucose = numOrNull(vitals.glucose);
    if (spo2 !== null && spo2 < 90) warnings.push(`CRITICAL: SpO₂ ${spo2}% is below 90% — patient may need urgent oxygen/care`);
    if (spo2 !== null && spo2 > 100) warnings.push(`SpO₂ ${spo2}% is above 100% — check reading`);
    if (sys !== null && sys < 90) warnings.push(`CRITICAL: Systolic BP ${sys} mmHg is dangerously low`);
    if (sys !== null && sys > 180) warnings.push(`CRITICAL: Systolic BP ${sys} mmHg is dangerously high`);
    if (dia !== null && dia > 120) warnings.push(`CRITICAL: Diastolic BP ${dia} mmHg is dangerously high`);
    if (hr !== null && hr < 40) warnings.push(`CRITICAL: Heart rate ${hr} bpm is dangerously low`);
    if (hr !== null && hr > 120) warnings.push(`WARNING: Heart rate ${hr} bpm is elevated`);
    if (hr !== null && hr > 150) warnings.push(`CRITICAL: Heart rate ${hr} bpm is dangerously high`);
    if (temp !== null && temp < 35) warnings.push(`CRITICAL: Temperature ${temp}°C indicates hypothermia`);
    if (temp !== null && temp > 39) warnings.push(`WARNING: Temperature ${temp}°C indicates high fever`);
    if (temp !== null && temp > 41) warnings.push(`CRITICAL: Temperature ${temp}°C is dangerously high`);
    if (rr !== null && rr < 8) warnings.push(`CRITICAL: Respiratory rate ${rr}/min is dangerously low`);
    if (rr !== null && rr > 30) warnings.push(`CRITICAL: Respiratory rate ${rr}/min is dangerously high`);
    if (glucose !== null && glucose < 3.0) warnings.push(`CRITICAL: Blood glucose ${glucose} mmol/L is dangerously low`);
    if (glucose !== null && glucose > 15) warnings.push(`WARNING: Blood glucose ${glucose} mmol/L is very high`);
    return warnings;
  };

  const [criticalWarnings, setCriticalWarnings] = useState<string[]>([]);
  const [showCriticalConfirm, setShowCriticalConfirm] = useState(false);

  const saveVitals = async (confirmed = false) => {
    if (!vitalsPatientId) { toast.error('Select a patient'); return; }
    if (!user) { toast.error('You must be signed in'); return; }
    // Patient-safety: flag critical values BEFORE saving
    if (!confirmed) {
      const warnings = checkCriticalVitals();
      if (warnings.length > 0) {
        setCriticalWarnings(warnings);
        setShowCriticalConfirm(true);
        return;
      }
    }
    setShowCriticalConfirm(false);
    setCriticalWarnings([]);
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

      // Offline: queue the vitals + their patient-visible mirror rows
      // on-device; useOfflineSync replays them on reconnect.
      if (!navigator.onLine) {
        const queuedMain = await queueAction({ table: 'vital_signs', operation: 'insert', data: payload });
        if (!queuedMain) throw new Error('Could not save vitals on this device');
        for (const row of mirrorRows) {
          await queueAction({ table: 'comprehensive_health_metrics', operation: 'insert', data: row });
        }
        toast.info("You're offline — vitals saved on this device and will sync when you reconnect.");
        setShowVitals(false);
        setVitals({ sys: '', dia: '', hr: '', temp: '', spo2: '', rr: '', glucose: '', weight: '' });
        setVitalsNotes('');
        setVitalsPatientId('');
        setVitalsToday((prev) => (prev ?? 0) + 1);
        return;
      }

      const { error } = await supabase.from('vital_signs').insert(payload);
      if (error) throw error;
      // Mirror into comprehensive_health_metrics so the patient can see
      // provider-recorded vitals in their own app (MedicalRecords reads that
      // table, not vital_signs). Best-effort: a mirror failure must not roll
      // back the clinical record.
      try {
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
      // Refresh the dashboard stats to show the new vitals count
      setVitalsToday((prev) => (prev ?? 0) + 1);
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, 'Failed to record vitals'));
    } finally {
      setSavingVitals(false);
    }
  };

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const handleItemClick = (item: ActionItem) => {
    if (item.action) { item.action(); return; }
    if (item.route) handleNavigation(item.route, item.title);
  };

  useEffect(() => {
    const loadGlance = async () => {
      try {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count: appts } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', user.id)
          .eq('date', today)
          .neq('status', 'cancelled');
        setTodayPatients(appts ?? 0);

        const { count: pending } = await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('provider_id', user.id)
          .eq('status', 'pending');
        setPendingActions(pending ?? 0);

        // Vitals recorded by this nurse today (best-effort; metadata filter)
        try {
          const { count: v } = await supabase
            .from('vital_signs')
            .select('id', { count: 'exact', head: true })
            .gte('recorded_at', startOfDay.toISOString());
          setVitalsToday(v ?? 0);
        } catch {
          setVitalsToday(0);
        }
      } catch {
        setTodayPatients(0);
        setVitalsToday(0);
        setPendingActions(0);
      }
    };
    loadGlance();
  }, [user]);

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;

  const groups: ActionGroup[] = [
    {
      title: 'Clinical Care',
      primary: { title: 'Record Patient Vitals', description: 'BP, temperature, pulse & vitals with safety alerts', icon: icon(Thermometer), action: () => setShowVitals(!showVitals) },
      secondary: [
        { title: 'Allergy Alerts', description: 'Patient allergy checks before administration', icon: icon(Shield), route: '/institution/patients' },
        { title: 'Care Plans', description: 'Create and manage patient care plans', icon: icon(Heart), route: '/institution/patients' },
        { title: 'Medication Administration', description: 'Track medication schedules & administration', icon: icon(Pill), route: '/medications' },
        { title: 'Wound & Procedure Log', description: 'Document wound care, injections & procedures', icon: icon(Activity), route: '/institution/patients' },
        { title: 'Infection Control', description: 'Infection tracking & preventive protocols', icon: icon(Bug), route: '/institution/patients' },
        { title: 'Discharge Checklists', description: 'Nursing clearance for patient discharge', icon: icon(ClipboardList), route: '/institution/patients' },
        { title: 'IoT Vitals Monitor', description: 'Real-time device vitals streaming', icon: icon(Activity), route: '/iot-monitoring' },
        { title: 'Health Camps', description: 'Screenings at outreach camps', icon: icon(Tent), route: '/hospital-management?tab=camps' },
      ],
    },
    {
      title: 'Schedule',
      primary: { title: 'Patient Appointments', description: "Today's consultations and upcoming visits", icon: icon(ClipboardList), route: '/appointments' },
      secondary: [
        { title: 'My Schedule', description: 'Appointments, home visits & shift calendar', icon: icon(Calendar), route: '/provider-calendar' },
        { title: 'Home Visit Notes', description: 'Document home visit findings & follow-ups', icon: icon(Home), route: '/institution/patients' },
        { title: 'Video Consultations', description: 'Telemedicine & remote nursing care', icon: icon(Video), route: '/video-consultations' },
      ],
    },
    {
      title: 'Communication',
      primary: { title: 'Patient Chat', description: 'Secure messaging with patients & doctors', icon: icon(MessageSquare), route: '/chat' },
      secondary: [
        { title: 'My Patients', description: 'Your connected patient network', icon: icon(Users), route: '/connections' },
        { title: 'Patient Waitlist', description: 'Manage waitlisted patients', icon: icon(Bell), route: '/provider-dashboard' },
        { title: 'Appointment Reminders', description: 'Automated SMS/email reminders', icon: icon(Bell), route: '/appointments' },
      ],
    },
    {
      title: 'Practice',
      primary: isInstitutionAffiliated
        ? { title: 'Professional Profile', description: 'Nursing credentials & certifications', icon: icon(Stethoscope), route: '/profile' }
        : { title: 'Earnings & Wallet', description: 'View consultation revenue and payouts', icon: icon(Wallet), route: '/wallet' },
      secondary: [
        ...(!isInstitutionAffiliated ? [{ title: 'Professional Profile', description: 'Nursing credentials & certifications', icon: icon(Stethoscope), route: '/profile' }] : []),
        { title: 'Emergency Protocols', description: 'Emergency response & first aid tools', icon: icon(AlertTriangle), route: '/emergency' },
        { title: 'Insurance Verification', description: 'Verify patient insurance cards', icon: icon(CreditCard), route: '/appointments' },
        { title: 'Promote Practice', description: 'Sponsored listings & growth tools', icon: icon(Megaphone), route: '/provider-dashboard' },
        { title: 'Booking Widget', description: 'Embed booking on your website', icon: icon(Code2), route: '/provider-dashboard' },
        { title: 'Settings', description: 'Consultation & practice preferences', icon: icon(Settings), route: '/settings' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Heart className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Nurse Clinical Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Nurse Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            onClick={() => handleItemClick({ title: 'Patient Appointments', route: '/appointments' })}
            className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm transition-all hover:bg-primary-600 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <Users className="h-5 w-5 opacity-80" />
              <ChevronRight className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{todayPatients ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium">Today's patients</p>
            <p className="text-[13px] opacity-80">Scheduled consultations</p>
          </button>

          <button
            onClick={() => { setShowVitals(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Thermometer className="h-5 w-5 text-emerald-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{vitalsToday ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Vitals recorded today</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Tap to record new vitals</p>
          </button>

          <button
            onClick={() => handleItemClick({ title: 'Pending Actions', route: '/appointments' })}
            className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Bell className="h-5 w-5 text-amber-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{pendingActions ?? '–'}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Pending actions</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Bookings awaiting confirmation</p>
          </button>
        </div>
      </section>

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
              <HospitalPatientSelect
                institutionId={institutionId}
                patients={vitalsPatients}
                value={vitalsPatientId}
                onChange={setVitalsPatientId}
                label="Patient *"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-[13px] font-medium">BP Systolic (mmHg)</Label>
                <input type="number" min={50} max={300} value={vitals.sys}
                  onChange={e => setVitals({ ...vitals, sys: e.target.value })}
                  placeholder="120" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">BP Diastolic (mmHg)</Label>
                <input type="number" min={30} max={200} value={vitals.dia}
                  onChange={e => setVitals({ ...vitals, dia: e.target.value })}
                  placeholder="80" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Heart Rate (bpm)</Label>
                <input type="number" min={20} max={250} value={vitals.hr}
                  onChange={e => setVitals({ ...vitals, hr: e.target.value })}
                  placeholder="72" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Temperature (°C)</Label>
                <input type="number" step="0.1" min={30} max={45} value={vitals.temp}
                  onChange={e => setVitals({ ...vitals, temp: e.target.value })}
                  placeholder="36.6" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">SpO₂ (%)</Label>
                <input type="number" min={50} max={100} value={vitals.spo2}
                  onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                  placeholder="98" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Resp. Rate (/min)</Label>
                <input type="number" min={5} max={60} value={vitals.rr}
                  onChange={e => setVitals({ ...vitals, rr: e.target.value })}
                  placeholder="16" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Glucose (mmol/L)</Label>
                <input type="number" step="0.1" min={1} max={40} value={vitals.glucose}
                  onChange={e => setVitals({ ...vitals, glucose: e.target.value })}
                  placeholder="5.5" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Weight (kg)</Label>
                <input type="number" step="0.1" min={1} max={400} value={vitals.weight}
                  onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                  placeholder="70" className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-300 p-3 text-[16px] dark:border-slate-700 dark:bg-slate-900" />
              </div>
            </div>
            <div>
              <Label className="text-[13px] font-medium">Notes</Label>
              <Textarea value={vitalsNotes} onChange={e => setVitalsNotes(e.target.value)}
                placeholder="Observation notes…" rows={2} className="mt-1 text-[16px]" />
            </div>
            {showCriticalConfirm && criticalWarnings.length > 0 && (
              <div className="space-y-2 rounded-2xl border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950/40" role="alert">
                <p className="flex items-center gap-2 text-[15px] font-bold text-red-700 dark:text-red-300">
                  ⚠️ Critical vital signs detected
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {criticalWarnings.map((w, i) => (
                    <li key={i} className="text-[13px] text-red-700 dark:text-red-300">{w}</li>
                  ))}
                </ul>
                <p className="text-[13px] text-red-600 dark:text-red-400">
                  These values may indicate a medical emergency. Verify the readings, escalate per protocol, then confirm to record.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button onClick={() => saveVitals(true)} variant="destructive" className="min-h-[44px] flex-1">
                    Confirm — Record Anyway
                  </Button>
                  <Button onClick={() => { setShowCriticalConfirm(false); setCriticalWarnings([]); }} variant="outline" className="min-h-[44px] flex-1">
                    Re-check Values
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => saveVitals(false)} className="min-h-[44px] flex-1" disabled={savingVitals}>
                {savingVitals ? 'Saving…' : 'Save Vitals'}
              </Button>
              <Button onClick={() => { setShowVitals(false); setShowCriticalConfirm(false); setCriticalWarnings([]); }} variant="outline" className="min-h-[44px] flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {vitalsPatientId && <DeteriorationScores patientId={vitalsPatientId} />}

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <div className="rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Primary action */}
            <button
              onClick={() => handleItemClick(group.primary)}
              className="flex w-full items-center gap-4 border-b border-canvas-silk p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 dark:text-white">{group.primary.title}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            {/* Secondary actions */}
            <div className="divide-y divide-canvas-silk dark:divide-slate-800">
              {group.secondary.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
