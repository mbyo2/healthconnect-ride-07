import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Clinical Reminders / Health Maintenance (Epic parity)
 * Preventive care alerts based on age, gender, conditions, and history.
 * Helps clinicians ensure patients receive recommended screenings.
 */

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  overdue: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionLabel: string;
}

interface PatientInfo {
  date_of_birth?: string;
  gender?: string;
}

// Evidence-based preventive care guidelines (simplified)
function generateReminders(
  patient: PatientInfo,
  conditions: string[],
  lastVitals?: string,
  lastLabDate?: string,
): Reminder[] {
  const reminders: Reminder[] = [];
  const now = new Date();
  
  if (!patient.date_of_birth) return reminders;
  
  const age = differenceInYears(now, new Date(patient.date_of_birth));
  const gender = patient.gender?.toLowerCase();
  
  // Blood pressure check (adults, annually)
  if (age >= 18) {
    const monthsSinceVitals = lastVitals 
      ? differenceInMonths(now, new Date(lastVitals))
      : 999;
    if (monthsSinceVitals >= 12) {
      reminders.push({
        id: 'bp-check',
        title: 'Blood Pressure Check Due',
        description: `Last recorded ${monthsSinceVitals >= 999 ? 'never' : monthsSinceVitals + ' months ago'}. Annual screening recommended for adults.`,
        overdue: monthsSinceVitals >= 15,
        priority: monthsSinceVitals >= 18 ? 'high' : 'medium',
        category: 'Vital Signs',
        actionLabel: 'Record vitals',
      });
    }
  }
  
  // Diabetes screening (adults 35+, or with risk factors)
  if (age >= 35 || conditions.some(c => 
    c.toLowerCase().includes('obes') || 
    c.toLowerCase().includes('hypertension') ||
    c.toLowerCase().includes('prediabet')
  )) {
    const monthsSinceLab = lastLabDate
      ? differenceInMonths(now, new Date(lastLabDate))
      : 999;
    if (monthsSinceLab >= 12) {
      reminders.push({
        id: 'diabetes-screen',
        title: 'Diabetes Screening Due',
        description: 'HbA1c or fasting glucose recommended.',
        overdue: monthsSinceLab >= 15,
        priority: 'medium',
        category: 'Laboratory',
        actionLabel: 'Order labs',
      });
    }
  }
  
  // Cervical cancer screening (women 21-65)
  if (gender === 'female' && age >= 21 && age <= 65) {
    reminders.push({
      id: 'cervical-screen',
      title: 'Cervical Cancer Screening',
      description: 'Pap smear every 3 years (21-65) or HPV testing.',
      overdue: false,
      priority: 'medium',
      category: 'Cancer Screening',
      actionLabel: 'Schedule screening',
    });
  }
  
  // Breast cancer screening (women 40+)
  if (gender === 'female' && age >= 40) {
    reminders.push({
      id: 'breast-screen',
      title: 'Mammogram Due',
      description: 'Annual or biennial mammography recommended for women 40+.',
      overdue: false,
      priority: 'medium',
      category: 'Cancer Screening',
      actionLabel: 'Schedule mammogram',
    });
  }
  
  // Colorectal screening (adults 45+)
  if (age >= 45) {
    reminders.push({
      id: 'colorectal-screen',
      title: 'Colorectal Cancer Screening',
      description: 'Colonoscopy every 10 years or FIT annually for adults 45+.',
      overdue: false,
      priority: 'medium',
      category: 'Cancer Screening',
      actionLabel: 'Discuss options',
    });
  }
  
  // Hypertension follow-up (if hypertensive)
  if (conditions.some(c => c.toLowerCase().includes('hypertension'))) {
    reminders.push({
      id: 'htn-followup',
      title: 'Hypertension Follow-up',
      description: 'Regular BP monitoring and medication review needed.',
      overdue: false,
      priority: 'high',
      category: 'Chronic Disease',
      actionLabel: 'Schedule follow-up',
    });
  }
  
  // Diabetes management (if diabetic)
  if (conditions.some(c => c.toLowerCase().includes('diabet'))) {
    reminders.push({
      id: 'diabetes-mgmt',
      title: 'Diabetes Care Review',
      description: 'HbA1c, foot exam, eye exam, and kidney function review.',
      overdue: false,
      priority: 'high',
      category: 'Chronic Disease',
      actionLabel: 'Schedule review',
    });
  }
  
  // Childhood immunizations (under 5)
  if (age < 5) {
    reminders.push({
      id: 'child-immun',
      title: 'Immunization Review',
      description: 'Verify EPI schedule is up to date.',
      overdue: false,
      priority: 'high',
      category: 'Immunizations',
      actionLabel: 'Review EPI card',
    });
  }
  
  // Annual physical (adults)
  if (age >= 18) {
    reminders.push({
      id: 'annual-physical',
      title: 'Annual Physical Exam',
      description: 'Comprehensive annual health assessment.',
      overdue: false,
      priority: 'low',
      category: 'Preventive',
      actionLabel: 'Schedule physical',
    });
  }
  
  return reminders;
}

const PRIORITY_CONFIG = {
  high: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  medium: { icon: Bell, color: "text-warning-500", bg: "bg-warning/10" },
  low: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
};

export function ClinicalReminders({ patientId }: { patientId: string }) {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['clinical-reminders', patientId],
    queryFn: async () => {
      // Get patient demographics
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth, gender')
        .eq('id', patientId)
        .single();
      
      // Get active conditions
      const { data: conditions } = await supabase
        .from('patient_conditions')
        .select('condition_name')
        .eq('patient_id', patientId)
        .in('status', ['active', 'chronic']);
      
      // Get last vitals date
      const { data: vitals } = await supabase
        .from('vital_signs')
        .select('created_at')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // Get last lab date
      const { data: labs } = await supabase
        .from('lab_tests')
        .select('created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return generateReminders(
        {
          date_of_birth: (profile as any)?.date_of_birth,
          gender: (profile as any)?.gender,
        },
        (conditions || []).map((c: any) => c.condition_name),
        (vitals as any)?.created_at,
        (labs as any)?.created_at,
      );
    },
    enabled: !!patientId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Checking reminders...</div>;
  }

  if (!reminders || reminders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm font-medium">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No preventive care reminders at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  const overdue = reminders.filter(r => r.overdue);
  const upcoming = reminders.filter(r => !r.overdue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Health Maintenance
          {overdue.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {overdue.length} overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {overdue.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Overdue
            </p>
            {overdue.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </div>
        )}
        
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming / Due soon
            </p>
            {upcoming.map((r) => (
              <ReminderCard key={r.id} reminder={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const config = PRIORITY_CONFIG[reminder.priority];
  const Icon = config.icon;
  
  return (
    <div className={cn("p-3 rounded-lg border flex items-start gap-3", config.bg)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm">{reminder.title}</p>
          <Badge variant="outline" className="text-xs">
            {reminder.category}
          </Badge>
          {reminder.overdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {reminder.description}
        </p>
      </div>
    </div>
  );
}
