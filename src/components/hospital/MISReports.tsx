import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, DollarSign, Bed, Calendar, FileText, Download } from 'lucide-react';

export const MISReports = ({ hospital }: { hospital: any }) => {
  const reports = [
    { title: 'Daily Census Report', desc: 'OPD/IPD patient counts, bed occupancy', category: 'Operations', frequency: 'Daily', icon: <Users className="h-5 w-5" /> },
    { title: 'Revenue & Collection', desc: 'Billing, collections, outstanding by dept', category: 'Finance', frequency: 'Daily', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Department-wise Revenue', desc: 'Revenue breakdown by department & service', category: 'Finance', frequency: 'Monthly', icon: <BarChart3 className="h-5 w-5" /> },
    { title: 'Doctor Performance', desc: 'Consultations, procedures, revenue per doctor', category: 'HR', frequency: 'Monthly', icon: <TrendingUp className="h-5 w-5" /> },
    { title: 'Bed Occupancy Trends', desc: 'Occupancy rates, average LOS, turnover', category: 'Operations', frequency: 'Weekly', icon: <Bed className="h-5 w-5" /> },
    { title: 'OT Utilization', desc: 'Surgery counts, OT usage hours, cancellations', category: 'Operations', frequency: 'Weekly', icon: <Calendar className="h-5 w-5" /> },
    { title: 'Lab TAT Report', desc: 'Sample turnaround times by test type', category: 'Lab', frequency: 'Daily', icon: <FileText className="h-5 w-5" /> },
    { title: 'Pharmacy Sales', desc: 'Drug dispensing volume, revenue, expiry waste', category: 'Pharmacy', frequency: 'Daily', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Insurance Receivables', desc: 'Claims status, aging analysis, TPA-wise', category: 'Finance', frequency: 'Weekly', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Discharge Summary Report', desc: 'Discharge stats, LAMA, AMA cases', category: 'Operations', frequency: 'Daily', icon: <FileText className="h-5 w-5" /> },
    { title: 'Referral Analytics', desc: 'Incoming/outgoing referral patterns', category: 'Marketing', frequency: 'Monthly', icon: <TrendingUp className="h-5 w-5" /> },
    { title: 'Inventory Consumption', desc: 'Department-wise consumption & wastage', category: 'Inventory', frequency: 'Weekly', icon: <BarChart3 className="h-5 w-5" /> },
  ];

  const categories = [...new Set(reports.map(r => r.category))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">MIS Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground">Management information system — operational & financial reports</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export All</Button>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-foreground mb-2">{cat}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {reports.filter(r => r.category === cat).map((r, i) => (
              <Card key={i} className="cursor-pointer hover:shadow-md transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">{r.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{r.frequency}</Badge>
                        <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">Generate</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
