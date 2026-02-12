import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Package, 
  Pill, 
  ShoppingCart, 
  FileText, 
  Truck, 
  Settings, 
  BarChart3, 
  Users 
} from 'lucide-react';

export const PharmacyWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "Pharmacy Portal",
      description: "Overview and daily operations",
      icon: <Package className="h-5 w-5" />,
      route: '/pharmacy-portal'
    },
    {
      title: "Inventory Management",
      description: "Track stock, expiry, and reorders",
      icon: <Pill className="h-5 w-5" />,
      route: '/pharmacy-inventory'
    },
    {
      title: "Prescriptions",
      description: "Process and dispense prescriptions",
      icon: <FileText className="h-5 w-5" />,
      route: '/prescriptions'
    },
    {
      title: "Marketplace",
      description: "Manage your product listings",
      icon: <ShoppingCart className="h-5 w-5" />,
      route: '/marketplace'
    },
    {
      title: "Orders & Delivery",
      description: "Track orders and deliveries",
      icon: <Truck className="h-5 w-5" />,
      route: '/pharmacy-management'
    },
    {
      title: "Customers",
      description: "Customer records and history",
      icon: <Users className="h-5 w-5" />,
      route: '/connections'
    },
    {
      title: "Sales Analytics",
      description: "Revenue and performance reports",
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/pharmacy-portal'
    },
    {
      title: "Settings",
      description: "Pharmacy preferences and profile",
      icon: <Settings className="h-5 w-5" />,
      route: '/settings'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Pharmacy Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your pharmacy operations, inventory, and prescriptions
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <CardTitle className="text-xs leading-tight text-foreground">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-3 leading-tight">
                {step.description}
              </CardDescription>
              <Button 
                onClick={() => handleNavigation(step.route, step.title)}
                size="sm" 
                className="w-full hover:shadow-sm transition-all active:scale-95 touch-manipulation text-xs"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
