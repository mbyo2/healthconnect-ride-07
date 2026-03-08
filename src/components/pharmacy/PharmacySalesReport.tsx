import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/use-currency';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444'];

export const PharmacySalesReport = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const { data: pharmacyId } = useQuery({
    queryKey: ['pharmacy-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('institution_staff')
        .select('institution_id')
        .eq('provider_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      return data?.institution_id || null;
    },
    enabled: !!user,
  });

  const getDateFilter = () => {
    const now = new Date();
    if (period === 'today') return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    if (period === 'week') { now.setDate(now.getDate() - 7); return now.toISOString(); }
    now.setMonth(now.getMonth() - 1); return now.toISOString();
  };

  const { data: sales } = useQuery({
    queryKey: ['pos-sales-report', pharmacyId, period],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('pos_sales')
        .select('*')
        .eq('pharmacy_id', pharmacyId!)
        .gte('created_at', getDateFilter())
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  const totalRevenue = sales?.reduce((sum: number, s: any) => sum + s.total_amount, 0) || 0;
  const totalTransactions = sales?.length || 0;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const paymentBreakdown = sales?.reduce((acc: any, s: any) => {
    acc[s.payment_method] = (acc[s.payment_method] || 0) + s.total_amount;
    return acc;
  }, {}) || {};

  const pieData = Object.entries(paymentBreakdown).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value: value as number,
  }));

  // Group by hour for today, by day for week/month
  const chartData = sales?.reduce((acc: any[], s: any) => {
    const date = new Date(s.created_at);
    const key = period === 'today'
      ? `${date.getHours()}:00`
      : date.toLocaleDateString('en-ZM', { month: 'short', day: 'numeric' });
    const existing = acc.find(a => a.label === key);
    if (existing) { existing.revenue += s.total_amount; existing.count += 1; }
    else acc.push({ label: key, revenue: s.total_amount, count: 1 });
    return acc;
  }, []) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Sales Report</h2>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Transactions</span>
            </div>
            <p className="text-2xl font-bold">{totalTransactions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Avg Sale</span>
            </div>
            <p className="text-2xl font-bold">{formatPrice(avgTransaction)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Cash</span>
            </div>
            <p className="text-2xl font-bold">{formatPrice(paymentBreakdown.cash || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue Over Time</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No sales data</p>
            )}
          </CardContent>
        </Card>

        {/* Payment breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatPrice(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.slice(0, 20).map((sale: any) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs">{sale.receipt_number}</TableCell>
                  <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {sale.payment_method?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(sale.total_amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
