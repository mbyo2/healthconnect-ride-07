import React, { useState } from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import {
  Calendar, Users, FileText, Settings, ClipboardList, MessageSquare,
  Brain, Wallet, AlertTriangle, Video, Activity, Apple, Scale
} from 'lucide-react';

export const NutritionistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState({ bmi: '', calories: '', breakfast: '', lunch: '', dinner: '', snacks: '', notes: '' });

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "Diet Plans", description: "Personalized nutrition plans", icon: <Apple className="h-5 w-5" />, action: () => setShowPlan(!showPlan) },
    { title: "My Schedule", description: "Availability & calendar", icon: <Calendar className="h-5 w-5" />, route: '/provider-calendar' },
    { title: "Patient Queue", description: "Today's consultations", icon: <ClipboardList className="h-5 w-5" />, route: '/appointments' },
    { title: "Patient Records", description: "Nutrition history & assessments", icon: <FileText className="h-5 w-5" />, route: '/medical-records' },
    { title: "BMI & Assessment", description: "Nutritional assessment tools", icon: <Scale className="h-5 w-5" />, route: '/medical-records' },
    { title: "AI Assistant", description: "AI-powered nutrition support", icon: <Brain className="h-5 w-5" />, route: '/ai-diagnostics' },
    { title: "Video Consultations", description: "Telemedicine", icon: <Video className="h-5 w-5" />, route: '/video-consultations' },
    { title: "My Patients", description: "Connected patients", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Patient Chat", description: "Secure messaging", icon: <MessageSquare className="h-5 w-5" />, route: '/chat' },
    { title: "Health Analytics", description: "Nutrition outcomes", icon: <Activity className="h-5 w-5" />, route: '/health-analytics' },
    ...(!isInstitutionAffiliated ? [{ title: "Earnings & Wallet", description: "Revenue & payouts", icon: <Wallet className="h-5 w-5" />, route: '/wallet' }] : []),
    { title: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto font-sans">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md">
            <Apple className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-600 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">Nutritionist Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">Nutrition Dashboard</h1>
            <p className="text-xs text-slate-400 font-medium">Diet plans, nutritional assessments & patient counseling</p>
          </div>
        </div>
      </div>

      {showPlan && (
        <Card className="border-primary-200">
          <CardHeader><CardTitle className="flex items-center gap-2"><Apple className="h-5 w-5 text-primary-500" />Diet Plan Builder</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[11px]">BMI</Label><Input value={plan.bmi} onChange={e => setPlan({...plan, bmi: e.target.value})} placeholder="24.5" className="mt-1" /></div>
              <div><Label className="text-[11px]">Daily Calories (kcal)</Label><Input value={plan.calories} onChange={e => setPlan({...plan, calories: e.target.value})} placeholder="2000" className="mt-1" /></div>
            </div>
            <div><Label className="text-[11px]">Breakfast</Label><Textarea value={plan.breakfast} onChange={e => setPlan({...plan, breakfast: e.target.value})} placeholder="Oatmeal with fruits..." className="mt-1" rows={2} /></div>
            <div><Label className="text-[11px]">Lunch</Label><Textarea value={plan.lunch} onChange={e => setPlan({...plan, lunch: e.target.value})} placeholder="Grilled chicken salad..." className="mt-1" rows={2} /></div>
            <div><Label className="text-[11px]">Dinner</Label><Textarea value={plan.dinner} onChange={e => setPlan({...plan, dinner: e.target.value})} placeholder="Fish with vegetables..." className="mt-1" rows={2} /></div>
            <Button onClick={() => { showSuccess({ message: 'Diet plan saved' }); setShowPlan(false); }} className="w-full">Save Diet Plan</Button>
          </CardContent>
        </Card>
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
