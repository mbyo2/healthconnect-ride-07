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
  steps: WorkflowStep[];
}

const workflows: Workflow[] = [
  {
    id: 'doctor-visit',
    title: 'Doctor Visit',
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
    steps: [
      { icon: AlertTriangle, label: 'SOS', route: '/emergency' },
      { icon: Building2, label: 'Hospital', route: '/healthcare-institutions' },
      { icon: Ambulance, label: 'Call', route: '/emergency' },
      { icon: Heart, label: 'Care', route: '/emergency' },
    ]
  },
];

export const ConnectedWorkflows: React.FC = () => {
  const navigate = useNavigate();

  const handleStepClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground px-1">Quick Workflows</h2>

      <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="overflow-hidden group hover:shadow-lg transition-all border-border min-w-[200px] snap-start flex-shrink-0 sm:min-w-0">
            {/* Single-primary tint system (same as the MetricCard family):
                pale primary band + primary title for every workflow — no
                per-card rainbow colours. */}
            <CardHeader className="py-2 px-3 bg-primary-500/10">
              <CardTitle className="text-xs font-bold text-primary-500">{workflow.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex items-center justify-evenly gap-1">
                {workflow.steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => handleStepClick(step.route)}
                      className="flex items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group/step active:scale-95"
                      aria-label={step.label}
                      title={step.label}
                    >
                      <div className="p-1.5 rounded-full bg-muted group-hover/step:bg-primary/10 transition-colors">
                        <step.icon className="h-3.5 w-3.5 text-primary-500 group-hover/step:scale-110 transition-transform" />
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
