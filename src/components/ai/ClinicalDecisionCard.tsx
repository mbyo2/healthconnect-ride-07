import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Calendar,
  Pill,
  FileText,
  Stethoscope,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ClinicalDecision {
  type: 'emergency' | 'urgent' | 'routine' | 'preventive' | 'monitoring';
  title: string;
  description: string;
  actions: ClinicalAction[];
  confidence: number;
  timeframe?: string;
}

export interface ClinicalAction {
  id: string;
  label: string;
  type: 'navigate' | 'schedule' | 'call' | 'medication' | 'test' | 'monitor';
  route?: string;
  priority: 'high' | 'medium' | 'low';
  details?: string;
}

interface ClinicalDecisionCardProps {
  decision: ClinicalDecision;
  onActionClick?: (action: ClinicalAction) => void;
  compact?: boolean;
}

const typeConfig = {
  emergency: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive',
    badge: 'destructive' as const
  },
  urgent: {
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    badge: 'default' as const
  },
  routine: {
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary',
    badge: 'secondary' as const
  },
  preventive: {
    icon: Activity,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    badge: 'outline' as const
  },
  monitoring: {
    icon: Stethoscope,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    badge: 'secondary' as const
  }
};

const actionIcons: Record<ClinicalAction['type'], typeof Phone> = {
  navigate: ArrowRight,
  schedule: Calendar,
  call: Phone,
  medication: Pill,
  test: FileText,
  monitor: Activity
};

export const ClinicalDecisionCard = ({ decision, onActionClick, compact = false }: ClinicalDecisionCardProps) => {
  const navigate = useNavigate();
  const config = typeConfig[decision.type];
  const Icon = config.icon;

  const handleActionClick = (action: ClinicalAction) => {
    if (onActionClick) {
      onActionClick(action);
    }

    if (action.route) {
      navigate(action.route);
    }
  };

  if (compact) {
    return (
      <div className={`rounded-lg p-3 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 ${config.color} mt-0.5`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{decision.title}</p>
            <p className="text-xs text-muted-foreground truncate">{decision.description}</p>
          </div>
          {decision.actions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => handleActionClick(decision.actions[0])}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-2 ${config.borderColor} overflow-hidden`}>
      <CardHeader className={`${config.bgColor} py-3`}>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <span>{decision.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badge} className="capitalize">
              {decision.type}
            </Badge>
            {decision.timeframe && (
              <Badge variant="outline" className="text-xs">
                {decision.timeframe}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">{decision.description}</p>

        {decision.confidence > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${config.bgColor.replace('/10', '')}`}
                style={{ width: `${decision.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium">{Math.round(decision.confidence * 100)}%</span>
          </div>
        )}

        {decision.actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recommended Actions
            </p>
            <div className="grid gap-2">
              {decision.actions.map((action) => {
                const ActionIcon = actionIcons[action.type];
                return (
                  <Button
                    key={action.id}
                    variant={action.priority === 'high' ? 'default' : 'outline'}
                    className="w-full justify-start gap-2 h-auto py-2"
                    onClick={() => handleActionClick(action)}
                  >
                    <ActionIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <span className="block text-sm">{action.label}</span>
                      {action.details && (
                        <span className="block text-xs opacity-70">{action.details}</span>
                      )}
                    </div>
                    <Badge
                      variant={action.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {action.priority}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper to parse AI response and extract clinical decisions
export const parseClinicalDecisions = (aiResponse: string): ClinicalDecision[] => {
  const decisions: ClinicalDecision[] = [];

  // Check for emergency indicators
  const emergencyKeywords = ['emergency', 'call 911', 'immediately', 'life-threatening', 'urgent care', 'severe pain', 'difficulty breathing', 'chest pain'];
  const urgentKeywords = ['within 24 hours', 'see a doctor soon', 'schedule appointment', 'consult', 'persistent', 'worsening'];
  const preventiveKeywords = ['screening', 'vaccination', 'checkup', 'prevention', 'routine check', 'healthy lifestyle'];
  const monitoringKeywords = ['monitor', 'track', 'watch for', 'observe', 'daily', 'regularly'];
  const medicationKeywords = ['medicine', 'prescription', 'pill', 'pharmacy', 'drug', 'medication', 'dosage', 'antibiotic'];
  const labKeywords = ['lab', 'test', 'blood work', 'results', 'scan', 'x-ray', 'mri', 'ultrasound'];

  const lowerResponse = aiResponse.toLowerCase();

  // Emergency detection
  if (emergencyKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'emergency',
      title: 'Seek Emergency Care',
      description: 'Based on the symptoms described, immediate medical attention may be required.',
      confidence: 0.95,
      timeframe: 'Immediately',
      actions: [
        { id: 'call-emergency', label: 'Call Emergency Services', type: 'call', priority: 'high', details: 'Dial emergency number' },
        { id: 'find-er', label: 'Find Nearest ER', type: 'navigate', route: '/map', priority: 'high' }
      ]
    });
  }

  // Medication/Pharmacy detection
  if (medicationKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'routine',
      title: 'Medication & Pharmacy',
      description: 'You can manage your prescriptions or order medications through our marketplace.',
      confidence: 0.85,
      actions: [
        { id: 'buy-medicine', label: 'Order Medications', type: 'navigate', route: '/marketplace', priority: 'high' },
        { id: 'view-meds', label: 'My Medications', type: 'navigate', route: '/medications', priority: 'medium' }
      ]
    });
  }

  // Lab/Test detection
  if (labKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'monitoring',
      title: 'Lab Tests & Results',
      description: 'View your lab results or schedule new diagnostic tests.',
      confidence: 0.8,
      actions: [
        { id: 'view-records', label: 'Medical Records', type: 'navigate', route: '/medical-records', priority: 'high' },
        { id: 'lab-mgmt', label: 'Lab Management', type: 'navigate', route: '/lab-management', priority: 'medium' }
      ]
    });
  }

  // Urgent care detection
  if (urgentKeywords.some(k => lowerResponse.includes(k)) && !emergencyKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'urgent',
      title: 'Schedule Medical Appointment',
      description: 'A healthcare professional should evaluate your condition soon.',
      confidence: 0.8,
      timeframe: 'Within 24-48 hours',
      actions: [
        { id: 'book-appointment', label: 'Book Appointment', type: 'schedule', route: '/appointments', priority: 'high' },
        { id: 'find-provider', label: 'Find Healthcare Provider', type: 'navigate', route: '/marketplace-users', priority: 'medium' },
        { id: 'video-consult', label: 'Start Video Consultation', type: 'navigate', route: '/video-consultations', priority: 'medium', details: 'Connect with a doctor now' }
      ]
    });
  }

  // Preventive care detection
  if (preventiveKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'preventive',
      title: 'Preventive Care Recommended',
      description: 'Consider scheduling preventive health measures.',
      confidence: 0.75,
      actions: [
        { id: 'schedule-screening', label: 'Schedule Health Screening', type: 'schedule', route: '/appointments', priority: 'medium' },
        { id: 'view-records-prev', label: 'Review Medical Records', type: 'navigate', route: '/medical-records', priority: 'low' }
      ]
    });
  }

  // Monitoring detection
  if (monitoringKeywords.some(k => lowerResponse.includes(k))) {
    decisions.push({
      type: 'monitoring',
      title: 'Health Monitoring Suggested',
      description: 'Track your symptoms and health metrics over time.',
      confidence: 0.7,
      actions: [
        { id: 'track-symptoms', label: 'Track in Symptoms Diary', type: 'navigate', route: '/symptoms', priority: 'medium' },
        { id: 'iot-monitor', label: 'View IoT Monitoring', type: 'navigate', route: '/iot-monitoring', priority: 'low' },
        { id: 'health-analytics', label: 'Health Analytics Dashboard', type: 'navigate', route: '/health-analytics', priority: 'low' }
      ]
    });
  }

  // Default routine recommendation if no other triggers
  if (decisions.length === 0 && aiResponse.length > 50) {
    decisions.push({
      type: 'routine',
      title: 'Follow-Up Recommended',
      description: 'Consider these follow-up actions based on your inquiry.',
      confidence: 0.6,
      actions: [
        { id: 'save-history', label: 'View Diagnosis History', type: 'navigate', route: '/ai-diagnostics', priority: 'low' },
        { id: 'chat-more', label: 'Continue Consultation', type: 'navigate', route: '/chat', priority: 'low' }
      ]
    });
  }

  return decisions;
};
