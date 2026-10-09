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
  Calendar, Users, FileText, Settings, ClipboardList, MessageSquare,
  Brain, Wallet, AlertTriangle, Video, Activity, HeartHandshake
} from 'lucide-react';

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking slowly, or being fidgety/restless',
  'Thoughts that you would be better off dead or hurting yourself',
];

export const PsychologistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated, institutionId } = useInstitutionAffiliation();
  const { user } = useAuth();
  const [showAssessment, setShowAssessment] = useState(false);
  const [scores, setScores] = useState<number[]>(new Array(9).fill(0));
  const [notes, setNotes] = useState('');
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [patients, setPatients] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  // Safety-critical: Question 9 (index 8) screens for self-harm/suicidal ideation.
  // Any score > 0 requires immediate crisis resource display.
  const selfHarmRisk = scores[8] > 0;

  // Load patient list when the assessment form opens.
  useEffect(() => {
    if (!showAssessment) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'patient')
        .order('last_name')
        .limit(200);
      setPatients(data ?? []);
    })();
  }, [showAssessment]);

  // Persist the PHQ-9 assessment. crisisAck=true only when the clinician
  // acknowledged the crisis modal for a Q9 > 0 self-harm signal.
  const saveAssessment = async (crisisAck: boolean) => {
    if (!patientId) { toast.error('Select a patient for this assessment'); return; }
    if (!user) { toast.error('You must be signed in to save'); return; }
    if (selfHarmRisk && !crisisAck) { toast.error('Acknowledge the crisis resources first'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('phq9_assessments').insert({
        institution_id: institutionId,
        patient_id: patientId,
        clinician_id: user.id,
        q1: scores[0], q2: scores[1], q3: scores[2],
        q4: scores[3], q5: scores[4], q6: scores[5],
        q7: scores[6], q8: scores[7], q9: scores[8],
        severity,
        self_harm_risk: selfHarmRisk,
        crisis_acknowledged: crisisAck,
        crisis_acknowledged_at: crisisAck ? new Date().toISOString() : null,
        notes: notes || null,
      });
      if (error) throw error;
      showSuccess({
        message: selfHarmRisk
          ? `PHQ-9 saved with SELF-HARM RISK FLAG: ${totalScore} (${severity})`
          : `PHQ-9 saved: ${totalScore} (${severity})`,
      });
      setShowCrisisAlert(false);
      setShowAssessment(false);
      setScores(new Array(9).fill(0));
      setNotes('');
      setPatientId('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save PHQ-9 assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const severity = totalScore >= 20 ? 'Severe' : totalScore >= 15 ? 'Moderately Severe' : totalScore >= 10 ? 'Moderate' : totalScore >= 5 ? 'Mild' : 'Minimal';

  const workflowSteps = [
    { title: "PHQ-9 Assessment", description: "Depression screening tool", icon: <HeartHandshake className="h-5 w-5" />, action: () => setShowAssessment(!showAssessment) },
    { title: "My Schedule", description: "Availability & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's sessions", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records", description: "Therapy notes & history", icon: <FileText className="h-5 w-5" />, route: '/institution/patients' },
    { title: "AI Assistant", description: "AI-powered support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Video Sessions", description: "Teletherapy", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected clients", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Secure Chat", description: "Client messaging", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Outcomes", description: "Treatment progress", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Crisis Protocols", description: "Emergency mental health", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Psychologist Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Mental Health Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">Assessments, therapy sessions & client care</p>
          </div>
        </div>
      </div>

      {showAssessment && (
        <Card className="border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary-500" />
              PHQ-9 Depression Assessment
              <span className="ml-auto text-sm font-normal">Score: {totalScore} — {severity}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-[11px]">Patient *</Label>
              <select
                required
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                className="w-full mt-1 p-2 rounded-md border border-graphite-300 dark:border-slate-700 font-bold text-sm"
              >
                <option value="">Select patient…</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            {PHQ9_QUESTIONS.map((q, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-medium mb-2">{i + 1}. {q}</div>
                <div className="flex gap-1">
                  {['Not at all', 'Several days', 'More than half', 'Nearly every day'].map((label, v) => (
                    <Button
                      key={v}
                      size="sm"
                      variant={scores[i] === v ? 'default' : 'outline'}
                      onClick={() => { const s = [...scores]; s[i] = v; setScores(s); }}
                      className="flex-1 text-[10px]"
                    >
                      {label} ({v})
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <Label className="text-[11px]">Clinical Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Assessment notes, treatment plan..." rows={3} className="mt-1" />
            </div>
            {selfHarmRisk && (
              <div className="p-3 bg-red-50 border-2 border-red-500 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Self-harm risk detected (Q9 &gt; 0)
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Saving will trigger crisis resources. Ensure the patient is safe.
                </p>
              </div>
            )}
            <Button onClick={() => {
              if (selfHarmRisk) {
                if (!patientId) { toast.error('Select a patient for this assessment'); return; }
                setShowCrisisAlert(true);
              } else {
                saveAssessment(false);
              }
            }} className="w-full" variant={selfHarmRisk ? "destructive" : "default"} disabled={saving}>
              {saving ? "Saving…" : selfHarmRisk ? "Save & Show Crisis Resources" : `Save Assessment (Score: ${totalScore})`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Safety-critical: Crisis resources for self-harm risk (PHQ-9 Q9 > 0) */}
      {showCrisisAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <Card className="max-w-md w-full border-4 border-red-600">
            <CardHeader className="bg-red-600 text-white">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-6 w-6" />
                Crisis Support Needed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="font-semibold text-red-700">
                This assessment indicates the patient may be at risk of self-harm.
              </p>
              <p className="text-sm">
                If you or someone you know is in crisis, please reach out immediately:
              </p>
              <div className="space-y-2 text-sm bg-slate-50 p-4 rounded-lg">
                <div className="font-semibold">Zambia Crisis Lines (verified):</div>
                <div>• Lifeline/Childline Zambia: <span className="font-mono font-bold">116</span> (toll-free, 24/7)</div>
                <div>• Lifeline/Childline Zambia: <span className="font-mono font-bold">933</span> (toll-free, 24/7)</div>
                <div>• Suicide crisis line: <span className="font-mono font-bold">096 026 4040</span></div>
                <div>• Police: <span className="font-mono font-bold">999</span></div>
                <div>• Ambulance: <span className="font-mono font-bold">992</span></div>
                <div>• Mobile emergency: <span className="font-mono font-bold">112</span></div>
              </div>
              <div className="text-xs text-slate-600">
                <p className="font-semibold mb-1">Immediate actions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Do not leave the patient alone</li>
                  <li>Contact emergency services if imminent risk</li>
                  <li>Arrange urgent psychiatric referral</li>
                  <li>Document safety plan in clinical notes</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => saveAssessment(true)}
                  className="flex-1"
                  variant="destructive"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Acknowledge & Save"}
                </Button>
                <Button
                  onClick={() => setShowCrisisAlert(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <div key={index} className="group cursor-pointer rounded-2xl border border-canvas-silk dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs hover:border-primary-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation flex flex-col justify-between"
            onClick={() => step.action ? step.action() : handleNavigation(step.route!, step.title)}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary-50 dark:bg-blue-950/60 text-primary-500 dark:text-blue-400 rounded-xl shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors">{step.icon}</div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">{step.title}</h3>
                <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{step.description}</p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); step.action ? step.action() : handleNavigation(step.route!, step.title); }}
              className="w-full mt-2 py-1.5 rounded-xl bg-canvas-bone dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-500 group-hover:text-white text-[11px] font-black transition-all">Open Module</button>
          </div>
        ))}
      </div>
    </div>
  );
};
