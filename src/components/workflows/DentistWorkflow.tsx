import React, { useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import {
  Stethoscope, Calendar, Users, FileText, Settings,
  ClipboardList, MessageSquare, Brain, Wallet, AlertTriangle,
  Shield, Video, Activity, Megaphone, Code2, Bell, Smile
} from 'lucide-react';

// FDI World Dental Federation tooth numbering (11-18, 21-28, 31-38, 41-48)
const TEETH_UPPER_RIGHT = ['18','17','16','15','14','13','12','11'];
const TEETH_UPPER_LEFT = ['21','22','23','24','25','26','27','28'];
const TEETH_LOWER_LEFT = ['31','32','33','34','35','36','37','38'];
const TEETH_LOWER_RIGHT = ['41','42','43','44','45','46','47','48'];

const TOOTH_CONDITIONS = [
  { code: 'healthy', label: 'Healthy', color: 'bg-emerald-500' },
  { code: 'caries', label: 'Caries', color: 'bg-red-500' },
  { code: 'filling', label: 'Filling', color: 'bg-blue-500' },
  { code: 'crown', label: 'Crown', color: 'bg-amber-500' },
  { code: 'missing', label: 'Missing', color: 'bg-slate-400' },
  { code: 'implant', label: 'Implant', color: 'bg-purple-500' },
  { code: 'rct', label: 'Root Canal', color: 'bg-orange-500' },
];

export const DentistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const [toothChart, setToothChart] = useState<Record<string, string>>({});
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const setToothCondition = (tooth: string, condition: string) => {
    setToothChart(prev => ({ ...prev, [tooth]: condition }));
    showSuccess({ message: `Tooth ${tooth} marked as ${condition}` });
  };

  const renderToothRow = (teeth: string[], label: string) => (
    <div className="mb-2">
      <div className="text-[10px] font-bold text-slate-500 mb-1">{label}</div>
      <div className="flex gap-1 flex-wrap">
        {teeth.map(tooth => {
          const condition = toothChart[tooth] || 'healthy';
          const condInfo = TOOTH_CONDITIONS.find(c => c.code === condition);
          return (
            <button
              key={tooth}
              onClick={() => setSelectedTooth(tooth)}
              className={`w-10 h-12 rounded-lg border-2 flex flex-col items-center justify-center text-[10px] font-bold transition-all ${
                selectedTooth === tooth ? 'border-primary-500 ring-2 ring-primary-200' : 'border-slate-200'
              } ${condInfo?.color} text-white hover:scale-105`}
              title={`Tooth ${tooth} - ${condInfo?.label}`}
            >
              {tooth}
            </button>
          );
        })}
      </div>
    </div>
  );

  const workflowSteps = [
    { title: "Dental Chart", description: "FDI tooth charting & treatment plans", icon: <Smile className="h-5 w-5" />, action: () => setShowChart(!showChart) },
    { title: "My Schedule", description: "Availability, appointments & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's consultations & upcoming visits", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records (EMR)", description: "Access case sheets, vitals & history", icon: <Stethoscope className="h-5 w-5" />, route: '/institution/patients' },
    { title: "Write Prescriptions", description: "Digital Rx with allergy & interaction alerts", icon: <FileText className="h-5 w-5" />, route: '/prescriptions' },
    { title: "AI Clinical Assistant", description: "AI-powered CDSS & diagnostic support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Video Consultations", description: "Telemedicine & remote patient care", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected patient network", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging with patients", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Health Analytics", description: "Patient trends & outcomes", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Consultation revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Emergency Protocols", description: "Emergency response tools", icon: <AlertTriangle className="h-5 w-5" />, route: '/emergency' },
    { title: "Professional Profile", description: "Credentials, specializations & bio", icon: <Stethoscope className="h-5 w-5" />, route: '/profile' },
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md">
            <Smile className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Dentist Clinical Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Dental Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">
              Dental charting, treatment plans, patient queue & digital prescriptions
            </p>
          </div>
        </div>
      </div>

      {showChart && (
        <Card className="border-primary-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smile className="h-5 w-5 text-primary-500" />
              Dental Chart — FDI Notation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {renderToothRow(TEETH_UPPER_RIGHT, 'Upper Right')}
                {renderToothRow(TEETH_UPPER_LEFT, 'Upper Left')}
                {renderToothRow(TEETH_LOWER_LEFT, 'Lower Left')}
                {renderToothRow(TEETH_LOWER_RIGHT, 'Lower Right')}
              </div>
              <div>
                <h4 className="text-sm font-bold mb-3">
                  {selectedTooth ? `Tooth ${selectedTooth} — Select Condition` : 'Select a tooth to chart'}
                </h4>
                {selectedTooth && (
                  <div className="grid grid-cols-2 gap-2">
                    {TOOTH_CONDITIONS.map(cond => (
                      <Button
                        key={cond.code}
                        variant={toothChart[selectedTooth] === cond.code ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setToothCondition(selectedTooth, cond.code)}
                        className="justify-start"
                      >
                        <span className={`w-3 h-3 rounded-full ${cond.color} mr-2`} />
                        {cond.label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-bold mb-2">Legend</div>
                  <div className="flex flex-wrap gap-2">
                    {TOOTH_CONDITIONS.map(cond => (
                      <span key={cond.code} className="text-[10px] flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${cond.color}`} />
                        {cond.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-primary-50 dark:bg-blue-950/60 text-primary-500 dark:text-blue-400 rounded-xl shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                  {step.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition-colors truncate">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium line-clamp-1">{step.description}</p>
                </div>
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
