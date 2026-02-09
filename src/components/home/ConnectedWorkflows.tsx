import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Heart
} from 'lucide-react';

interface WorkflowStep {
  icon: React.ElementType;
  label: string;
  route: string;
}

interface Workflow {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  steps: WorkflowStep[];
}

const workflows: Workflow[] = [
  {
    id: 'doctor-visit',
    title: 'Doctor Visit',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    steps: [
      { icon: Search, label: 'Find', route: '/marketplace-users' },
      { icon: Calendar, label: 'Book', route: '/appointments' },
      { icon: CreditCard, label: 'Pay', route: '/wallet' },
      { icon: Video, label: 'Consult', route: '/video-consultations' },
    ]
  },
  {
    id: 'medicine',
    title: 'Get Medicine',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    steps: [
      { icon: Pill, label: 'Rx', route: '/prescriptions' },
      { icon: ShoppingCart, label: 'Buy', route: '/marketplace' },
      { icon: CreditCard, label: 'Pay', route: '/wallet' },
      { icon: Truck, label: 'Track', route: '/marketplace' },
    ]
  },
  {
    id: 'emergency',
    title: 'Emergency',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500',
    steps: [
      { icon: AlertTriangle, label: 'SOS', route: '/emergency' },
      { icon: Building2, label: 'Hospital', route: '/healthcare-institutions' },
      { icon: Ambulance, label: '991', route: 'tel:991' },
      { icon: Heart, label: 'Care', route: '/emergency' },
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
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-1">Quick Workflows</h2>

      <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="overflow-hidden group hover:shadow-lg transition-all border-border min-w-[200px] snap-start flex-shrink-0 sm:min-w-0">
            <CardHeader className={`py-2 px-3 ${workflow.bgColor}`}>
              <CardTitle className="text-xs font-bold text-white">{workflow.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex items-center justify-evenly gap-1">
                {workflow.steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => handleStepClick(step.route)}
                      className="flex items-center justify-center p-1 rounded-lg hover:bg-muted transition-colors group/step active:scale-95"
                      aria-label={step.label}
                      title={step.label}
                    >
                      <div className="p-1.5 rounded-full bg-muted group-hover/step:bg-primary/10 transition-colors">
                        <step.icon className={`h-3.5 w-3.5 ${workflow.color} group-hover/step:scale-110 transition-transform`} />
                      </div>
                    </button>
                    {idx < workflow.steps.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0" />
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
