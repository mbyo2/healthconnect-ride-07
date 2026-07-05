import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, Users, DollarSign, Bed, Calendar, FileText,
  Download, ClipboardCheck, TestTube, Pill, AlertTriangle, Receipt, UserCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';

export const MISReports = ({ hospital }: { hospital: any }) => {
  const { formatPrice } = useCurrency();
  const hospitalId = hospital?.id;
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['mis-kpis', hospitalId],
    enabled: !!hospitalId,
    queryFn: async () => {
      const [beds, adm, inv, apt, feedback] = await Promise.all([
        supabase.from('hospital_beds' as any).select('id,status').eq('hospital_id', hospitalId),
        supabase.from('hospital_admissions' as any).select('id,status,admission_date').eq('hospital_id', hospitalId),
        supabase.from('hospital_billing' as any)
          .select('total_amount,balance,payment_status,created_at')
          .eq('hospital_id', hospitalId)
          .gte('created_at', monthStart),
        supabase.from('appointments').select('id,date').gte('date', today).lte('date', today),
        supabase.from('patient_feedback').select('rating').gte('created_at', monthStart),
      ]);

      const bedRows = (beds.data as any[]) || [];
      const admRows = (adm.data as any[]) || [];
      const invRows = (inv.data as any[]) || [];
      const fbRows = (feedback.data as any[]) || [];

      const totalBeds = bedRows.length;
      const occupied = bedRows.filter((b) => b.status === 'occupied').length;
      const admittedToday = admRows.filter(
        (a) => a.admission_date && a.admission_date.startsWith(today),
      ).length;
      const revenueMTD = invRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const outstanding = invRows.reduce((s, r) => s + Number(r.balance || 0), 0);
      const avgRating = fbRows.length
        ? fbRows.reduce((s, r) => s + Number(r.rating || 0), 0) / fbRows.length
        : 0;

      return {
        totalBeds,
        occupied,
        occupancy: totalBeds ? Math.round((occupied / totalBeds) * 100) : 0,
        activeAdmissions: admRows.filter((a) => a.status === 'admitted').length,
        admittedToday,
        appointmentsToday: (apt.data || []).length,
        revenueMTD,
        outstanding,
        avgRating,
        feedbackCount: fbRows.length,
      };
    },
  });

  const reports = [
    { title: 'Daily Census Report', desc: 'OPD/IPD patient counts, bed occupancy', category: 'Operations', frequency: 'Daily', icon: <Users className="h-5 w-5" /> },
    { title: 'Revenue & Collection', desc: 'Billing, collections, outstanding by dept', category: 'Finance', frequency: 'Daily', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Department-wise Revenue', desc: 'Revenue breakdown by department & service', category: 'Finance', frequency: 'Monthly', icon: <BarChart3 className="h-5 w-5" /> },
    { title: 'Doctor Performance', desc: 'Consultations, procedures, revenue per doctor', category: 'HR', frequency: 'Monthly', icon: <TrendingUp className="h-5 w-5" /> },
    { title: 'Bed Occupancy Trends', desc: 'Occupancy rates, average LOS, turnover', category: 'Operations', frequency: 'Weekly', icon: <Bed className="h-5 w-5" /> },
    { title: 'OT Utilization', desc: 'Surgery counts, OT usage hours, cancellations', category: 'Operations', frequency: 'Weekly', icon: <Calendar className="h-5 w-5" /> },
    { title: 'Lab TAT Report', desc: 'Sample turnaround times by test type', category: 'Lab', frequency: 'Daily', icon: <TestTube className="h-5 w-5" /> },
    { title: 'Outsourced Tests Report', desc: 'Tests outsourced to external labs, TAT & costs', category: 'Lab', frequency: 'Weekly', icon: <TestTube className="h-5 w-5" /> },
    { title: 'Pharmacy Sales', desc: 'Drug dispensing volume, revenue, expiry waste', category: 'Pharmacy', frequency: 'Daily', icon: <Pill className="h-5 w-5" /> },
    { title: 'Monthly Purchase (Supplier-wise)', desc: 'All purchase invoices grouped by supplier with subtotals', category: 'Pharmacy', frequency: 'Monthly', icon: <Receipt className="h-5 w-5" /> },
    { title: 'Near-Expiry Drug Report', desc: 'Drugs approaching expiry with batch and quantity details', category: 'Pharmacy', frequency: 'Weekly', icon: <AlertTriangle className="h-5 w-5" /> },
    { title: 'Insurance Receivables', desc: 'Claims status, aging analysis, TPA-wise', category: 'Finance', frequency: 'Weekly', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Sales & Return Tax Report', desc: 'Cash vs Credit breakdown with tax details for sales & returns', category: 'Finance', frequency: 'Monthly', icon: <Receipt className="h-5 w-5" /> },
    { title: 'Check-in vs Billed Report', desc: 'Discrepancy report: patients seen but not billed', category: 'Finance', frequency: 'Daily', icon: <ClipboardCheck className="h-5 w-5" /> },
    { title: 'Discharge Summary Report', desc: 'Discharge stats, LAMA, AMA cases', category: 'Operations', frequency: 'Daily', icon: <FileText className="h-5 w-5" /> },
    { title: 'Referral Analytics', desc: 'Incoming/outgoing referral patterns', category: 'Marketing', frequency: 'Monthly', icon: <TrendingUp className="h-5 w-5" /> },
    { title: 'Inventory Consumption', desc: 'Department-wise consumption & wastage', category: 'Inventory', frequency: 'Weekly', icon: <BarChart3 className="h-5 w-5" /> },
    { title: 'Infection Surveillance Report', desc: 'HAI trends, organisms, outcomes by period', category: 'Quality', frequency: 'Monthly', icon: <AlertTriangle className="h-5 w-5" /> },
    { title: 'Patient Feedback Analysis', desc: 'Ratings, satisfaction trends, NPS score', category: 'Quality', frequency: 'Monthly', icon: <UserCheck className="h-5 w-5" /> },
  ];

  const categories = [...new Set(reports.map((r) => r.category))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">MIS Reports & Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Management information system — live operational, financial & quality metrics
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.info('Export coming soon')}>
          <Download className="h-4 w-4" /> Export All
        </Button>
      </div>

      {/* Live KPI band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Bed Occupancy</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : `${kpis?.occupancy ?? 0}%`}</div>
            <p className="text-xs text-muted-foreground">{kpis?.occupied ?? 0}/{kpis?.totalBeds ?? 0} beds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Active Admissions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : kpis?.activeAdmissions ?? 0}</div>
            <p className="text-xs text-muted-foreground">{kpis?.admittedToday ?? 0} today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Revenue (MTD)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '…' : formatPrice(kpis?.revenueMTD ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{formatPrice(kpis?.outstanding ?? 0)} outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Patient Satisfaction</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '…' : (kpis?.avgRating ? kpis.avgRating.toFixed(1) : '—')}
            </div>
            <p className="text-xs text-muted-foreground">{kpis?.feedbackCount ?? 0} reviews</p>
          </CardContent>
        </Card>
      </div>

      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-foreground mb-2">{cat}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {reports.filter((r) => r.category === cat).map((r, i) => (
              <Card key={i} className="cursor-pointer hover:shadow-md transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">{r.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">{r.frequency}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 px-2"
                          onClick={() => toast.info(`Generating ${r.title}…`)}
                        >
                          Generate
                        </Button>
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
