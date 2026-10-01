import React, { useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import {
  Calendar, Users, FileText, Settings, ClipboardList, MessageSquare,
  Brain, Wallet, AlertTriangle, Video, Activity, Eye, Glasses
} from 'lucide-react';

export const OptometristWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const [showExam, setShowExam] = useState(false);
  const [exam, setExam] = useState({
    odSphere: '', odCylinder: '', odAxis: '', odAcuity: '',
    osSphere: '', osCylinder: '', osAxis: '', osAcuity: '',
    iopOd: '', iopOs: '', notes: ''
  });

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const saveExam = () => {
    showSuccess({ message: 'Eye examination saved to patient record' });
    setShowExam(false);
  };

  const workflowSteps = [
    { title: "Eye Examination", description: "Visual acuity, refraction & IOP", icon: <Eye className="h-5 w-5" />, action: () => setShowExam(!showExam) },
    { title: "My Schedule", description: "Availability, appointments & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's consultations & upcoming visits", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records (EMR)", description: "Access case sheets & history", icon: <FileText className="h-5 w-5" />, route: '/medical-records' },
    { title: "Write Prescriptions", description: "Digital Rx including eyewear", icon: <Glasses className="h-5 w-5" />, route: '/prescriptions' },
    { title: "AI Clinical Assistant", description: "AI-powered diagnostic support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Video Consultations", description: "Telemedicine & remote care", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected patient network", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Health Analytics", description: "Patient trends & outcomes", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Consultation revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Emergency Protocols", description: "Emergency response tools", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  const examField = (label: string, key: keyof typeof exam, placeholder: string) => (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Input
        value={exam[key]}
        onChange={e => setExam({ ...exam, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  );

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md">
            <Eye className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Optometrist Clinical Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Eye Care Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">Eye examinations, refraction, eyewear prescriptions & patient care</p>
          </div>
        </div>
      </div>

      {showExam && (
        <Card className="border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary-500" />
              Eye Examination Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-sm">Right Eye (OD)</h4>
                <div className="grid grid-cols-2 gap-3">
                  {examField('Sphere', 'odSphere', '-2.00')}
                  {examField('Cylinder', 'odCylinder', '-0.50')}
                  {examField('Axis', 'odAxis', '180')}
                  {examField('Visual Acuity', 'odAcuity', '6/6')}
                </div>
                {examField('IOP (mmHg)', 'iopOd', '15')}
              </div>
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-sm">Left Eye (OS)</h4>
                <div className="grid grid-cols-2 gap-3">
                  {examField('Sphere', 'osSphere', '-2.25')}
                  {examField('Cylinder', 'osCylinder', '-0.75')}
                  {examField('Axis', 'osAxis', '175')}
                  {examField('Visual Acuity', 'osAcuity', '6/6')}
                </div>
                {examField('IOP (mmHg)', 'iopOs', '16')}
              </div>
            </div>
            <div>
              <Label className="text-[11px]">Clinical Notes</Label>
              <Input
                value={exam.notes}
                onChange={e => setExam({ ...exam, notes: e.target.value })}
                placeholder="Examination findings, diagnosis, recommendations..."
                className="mt-1"
              />
            </div>
            <Button onClick={saveExam} className="w-full">Save Examination</Button>
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
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">{step.title}</h3>
                <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{step.description}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); step.action ? step.action() : handleNavigation(step.route!, step.title); }}
              className="w-full mt-2 py-1.5 rounded-xl bg-canvas-bone dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-primary-500 group-hover:text-white text-[11px] font-black transition-all"
            >
              Open Module
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
