import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  CreditCard, 
  Video, 
  ArrowRight, 
  Pill,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Building2,
  Ambulance,
  Heart,
  Stethoscope,
  MessageSquare
} from 'lucide-react';

interface WorkflowStep {
  icon: React.ElementType;
  label: string;
  route: string;
}

interface Workflow {
  id: string;
  title: string;
  description: string;
  color: string;
  steps: WorkflowStep[];
}

const workflows: Workflow[] = [
  {
    id: 'doctor-visit',
    title: 'Find Doctor → Book → Consult',
    description: 'Complete doctor visit journey',
    color: 'from-blue-500 to-blue-600',
    steps: [
      { icon: Search, label: 'Find Doctor', route: '/marketplace-users' },
      { icon: Calendar, label: 'Book Visit', route: '/appointments' },
      { icon: CreditCard, label: 'Pay', route: '/wallet' },
      { icon: Video, label: 'Consult', route: '/video-consultations' },
    ]
  },
  {
    id: 'medicine',
    title: 'Prescription → Pharmacy → Delivery',
    description: 'Get your medicine delivered',
    color: 'from-emerald-500 to-emerald-600',
    steps: [
      { icon: Pill, label: 'Prescriptions', route: '/prescriptions' },
      { icon: ShoppingCart, label: 'Buy Medicine', route: '/marketplace' },
      { icon: CreditCard, label: 'Pay', route: '/wallet' },
      { icon: Truck, label: 'Track Delivery', route: '/marketplace' },
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency → Hospital → Care',
    description: 'Get immediate help when needed',
    color: 'from-red-500 to-red-600',
    steps: [
      { icon: AlertTriangle, label: 'Emergency', route: '/emergency' },
      { icon: Building2, label: 'Find Hospital', route: '/healthcare-institutions' },
      { icon: Ambulance, label: 'Call 991', route: 'tel:991' },
      { icon: Heart, label: 'Get Care', route: '/emergency' },
    ]
  },
  {
    id: 'care-team',
    title: 'Build Your Care Team',
    description: 'Connect with healthcare providers',
    color: 'from-purple-500 to-purple-600',
    steps: [
      { icon: Stethoscope, label: 'Find Doctors', route: '/healthcare-professionals' },
      { icon: Building2, label: 'Clinics', route: '/healthcare-institutions' },
      { icon: MessageSquare, label: 'Chat', route: '/chat' },
      { icon: Calendar, label: 'Schedule', route: '/appointments' },
    ]
  },
];

export const ConnectedWorkflows: React.FC = () => {
  const navigate = useNavigate();

  const handleStepClick = (route: string) => {
    if (route.startsWith('tel:')) {
      window.location.href = route;
    } else {
      navigate(route);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Quick Workflows</h2>
        <span className="text-xs text-muted-foreground">Tap any step to start</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="overflow-hidden group hover:shadow-lg transition-all">
            <CardHeader className={`py-3 px-4 bg-gradient-to-r ${workflow.color} text-white`}>
              <CardTitle className="text-sm font-semibold">{workflow.title}</CardTitle>
              <CardDescription className="text-white/80 text-xs">
                {workflow.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-1">
                {workflow.steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => handleStepClick(step.route)}
                      className="flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors group/step"
                      aria-label={step.label}
                    >
                      <div className="p-2 rounded-full bg-primary/10 group-hover/step:bg-primary/20 transition-colors">
                        <step.icon className="h-5 w-5 text-foreground group-hover/step:text-primary" />
                      </div>
                    </button>
                    {idx < workflow.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
