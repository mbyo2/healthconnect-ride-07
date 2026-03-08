import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight, Activity, Repeat, Loader2 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const RevenueAnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30');
  const { formatPrice } = useCurrency();

  const { data: revenueEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['revenue-events', timeRange],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));
      const { data } = await (supabase as any)
        .from('revenue_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      return data || [];
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['all-subscriptions-analytics'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('user_subscriptions')
        .select('*, plan:subscription_plans(*)');
      return data || [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['payments-analytics', timeRange],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));
      const { data } = await (supabase as any)
        .from('payments')
        .select('*')
        .gte('created_at', startDate.toISOString());
      return data || [];
    },
  });

  const { data: commissionData } = useQuery({
    queryKey: ['commission-analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('commission_settings').select('*').eq('is_active', true);
      return data || [];
    },
  });

  // Compute KPIs
  const activeSubscriptions = subscriptions?.filter((s: any) => s.status === 'active') || [];
  const mrr = activeSubscriptions.reduce((sum: number, s: any) => {
    const plan = s.plan;
    if (!plan) return sum;
    return sum + (s.billing_cycle === 'monthly' ? plan.price_monthly : plan.price_annual / 12);
  }, 0);

  const totalRevenue = (revenueEvents || []).reduce((sum: number, e: any) => 
    e.event_type !== 'refund' ? sum + e.amount : sum - e.amount, 0);

  const cancelledThisMonth = subscriptions?.filter((s: any) => {
    if (s.status !== 'cancelled' || !s.cancelled_at) return false;
    const cancelDate = new Date(s.cancelled_at);
    const now = new Date();
    return cancelDate.getMonth() === now.getMonth() && cancelDate.getFullYear() === now.getFullYear();
  }).length || 0;

  const churnRate = activeSubscriptions.length > 0 
    ? ((cancelledThisMonth / (activeSubscriptions.length + cancelledThisMonth)) * 100).toFixed(1) 
    : '0';

  const totalPayments = payments?.filter((p: any) => p.status === 'completed').length || 0;
  const paymentVolume = payments?.filter((p: any) => p.status === 'completed')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;

  // Revenue by source
  const revenueBySource = (revenueEvents || []).reduce((acc: Record<string, number>, e: any) => {
    const source = e.event_type === 'subscription_started' || e.event_type === 'subscription_renewed' 
      ? 'Subscriptions' 
      : e.event_type === 'commission_earned' ? 'Commissions'
      : e.event_type === 'ad_revenue' ? 'Advertising'
      : 'One-time Payments';
    acc[source] = (acc[source] || 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(revenueBySource).map(([name, value]) => ({ name, value }));

  // Daily revenue trend
  const dailyRevenue = (revenueEvents || []).reduce((acc: Record<string, number>, e: any) => {
    const day = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    acc[day] = (acc[day] || 0) + (e.event_type !== 'refund' ? e.amount : -e.amount);
    return acc;
  }, {});

  const trendData = Object.entries(dailyRevenue).map(([date, amount]) => ({ date, amount }));

  // Subscription by plan
  const subsByPlan = activeSubscriptions.reduce((acc: Record<string, number>, s: any) => {
    const name = s.plan?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const planDistribution = Object.entries(subsByPlan).map(([name, count]) => ({ name, count }));

  if (eventsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Financial KPIs and revenue tracking</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold">{formatPrice(mrr)}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <ArrowUpRight className="h-3 w-3" /> <span>MRR from {activeSubscriptions.length} active subs</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue ({timeRange}d)</p>
                <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-full bg-chart-2/10"><TrendingUp className="h-5 w-5 text-chart-2" /></div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <Activity className="h-3 w-3" /> <span>{revenueEvents?.length || 0} revenue events</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-chart-3/10"><Users className="h-5 w-5 text-chart-3" /></div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <Repeat className="h-3 w-3" /> <span>Churn rate: {churnRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payment Volume</p>
                <p className="text-2xl font-bold">{formatPrice(paymentVolume)}</p>
              </div>
              <div className="p-3 rounded-full bg-chart-4/10"><CreditCard className="h-5 w-5 text-chart-4" /></div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <span>{totalPayments} completed payments</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Source</CardTitle>
            <CardDescription>Breakdown of revenue streams</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No revenue data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Distribution</CardTitle>
            <CardDescription>Active subscriptions by plan</CardDescription>
          </CardHeader>
          <CardContent>
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={planDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No subscriptions yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Structure</CardTitle>
            <CardDescription>Current payment split configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(commissionData || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium capitalize">{c.entity_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{c.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3">{c.commission_percentage}%</Badge>
                </div>
              ))}
              {(!commissionData || commissionData.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No commission settings configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
