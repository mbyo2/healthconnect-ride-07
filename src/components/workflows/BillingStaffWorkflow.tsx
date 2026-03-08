import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { DollarSign, FileText, CreditCard, BarChart3, Receipt, Shield } from 'lucide-react';

export const BillingStaffWorkflow = () => {
  const quickActions = [
    { to: '/wallet', label: 'Billing & Invoices', description: 'Create invoices & process payments', icon: <Receipt className="h-6 w-6" /> },
    { to: '/institution/reports', label: 'Financial Reports', description: 'Revenue & reconciliation', icon: <BarChart3 className="h-6 w-6" /> },
    { to: '/prescriptions', label: 'Insurance Claims', description: 'Process TPA & insurance', icon: <Shield className="h-6 w-6" /> },
    { to: '/institution/patients', label: 'Patient Accounts', description: 'Outstanding balances & ledger', icon: <FileText className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Accounts Dashboard</h1>
        <p className="text-muted-foreground">Invoicing, payments, insurance claims & financial reconciliation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" /> Today's Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Total collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5" /> Pending Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-destructive" /> Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Pending processing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card key={action.to} className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to={action.to}>
              <CardHeader className="pb-2">
                <div className="text-primary">{action.icon}</div>
                <CardTitle className="text-base">{action.label}</CardTitle>
                <CardDescription className="text-xs">{action.description}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
