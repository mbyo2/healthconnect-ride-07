import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import {
  Package, Pill, ShoppingCart, FileText, Truck, Settings,
  BarChart3, Users, Shield, AlertTriangle, Wallet, ClipboardList
} from 'lucide-react';

export const PharmacistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();

  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    { title: "Pharmacy Portal", description: "Overview & daily operations", icon: <Package className="h-5 w-5" />, route: '/pharmacy-portal' },
    { title: "Dispense Prescriptions", description: "Process Rx with allergy & interaction checks", icon: <FileText className="h-5 w-5" />, route: '/prescriptions' },
    { title: "Drug Interaction Checker", description: "Real-time interaction & contraindication alerts", icon: <Shield className="h-5 w-5" />, route: '/prescriptions' },
    { title: "Inventory Management", description: "Stock, expiry tracking & reorder alerts", icon: <Pill className="h-5 w-5" />, route: '/pharmacy-inventory' },
    { title: "Near-Expiry Alerts", description: "Medications approaching expiration", icon: <AlertTriangle className="h-5 w-5" />, route: '/pharmacy-inventory' },
    { title: "Controlled Substances", description: "Schedule tracking & compliance logs", icon: <ClipboardList className="h-5 w-5" />, route: '/pharmacy-inventory' },
    { title: "Marketplace", description: "Product listings & online sales", icon: <ShoppingCart className="h-5 w-5" />, route: '/marketplace' },
    { title: "Orders & Delivery", description: "Track orders & delivery zones", icon: <Truck className="h-5 w-5" />, route: '/pharmacy-management' },
    { title: "Customer Records", description: "Patient medication history", icon: <Users className="h-5 w-5" />, route: '/connections' },
    { title: "Medication Guide", description: "Drug information & patient counseling", icon: <Pill className="h-5 w-5" />, route: '/medications' },
    { title: "Sales Analytics", description: "Revenue, top sellers & trends", icon: <BarChart3 className="h-5 w-5" />, route: '/pharmacy-portal' },
    { title: "Promote Pharmacy", description: "Sponsored listings & visibility", icon: <Megaphone className="h-5 w-5" />, route: '/pharmacy-portal' },
    { title: "Insurance Verification", description: "Verify patient insurance for Rx", icon: <CreditCard className="h-5 w-5" />, route: '/prescriptions' },
    { title: "Earnings & Wallet", description: "Revenue & payment management", icon: <Wallet className="h-5 w-5" />, route: '/wallet' },
    { title: "Settings", description: "Pharmacy preferences & profile", icon: <Settings className="h-5 w-5" />, route: '/settings' },
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Pharmacist Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Dispensing, drug safety, inventory & patient counseling
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg shrink-0">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{step.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                </div>
              </div>
              <Button onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
                size="sm" className="w-full text-xs mt-2">Open</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
