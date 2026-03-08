import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { Plus, Search, User, Phone, Mail } from 'lucide-react';

export const PharmacyCustomers = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', insurance_provider: '', insurance_number: '', notes: '' });

  const { data: pharmacyId } = useQuery({
    queryKey: ['pharmacy-institution', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('institution_staff').select('institution_id')
        .eq('provider_id', user!.id).eq('is_active', true).maybeSingle();
      return data?.institution_id || null;
    },
    enabled: !!user,
  });

  const { data: customers } = useQuery({
    queryKey: ['pharmacy-customers', pharmacyId, search],
    queryFn: async () => {
      let query = (supabase as any).from('pharmacy_customers').select('*')
        .eq('pharmacy_id', pharmacyId!).order('last_visit_at', { ascending: false, nullsFirst: false });
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: !!pharmacyId,
  });

  const addCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('pharmacy_customers').insert({
        pharmacy_id: pharmacyId, ...form,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-customers'] });
      setShowAdd(false);
      setForm({ name: '', phone: '', email: '', insurance_provider: '', insurance_number: '', notes: '' });
      toast.success('Customer added');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Customers</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> Add Customer</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead>Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.insurance_provider ? (
                      <Badge variant="outline" className="text-xs">{c.insurance_provider}</Badge>
                    ) : <span className="text-xs text-muted-foreground">None</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatPrice(c.total_purchases || 0)}</TableCell>
                  <TableCell className="text-right">{c.visit_count || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {(!customers || customers.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No customers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={e => setForm({ ...form, insurance_provider: e.target.value })} /></div>
              <div><Label>Insurance #</Label><Input value={form.insurance_number} onChange={e => setForm({ ...form, insurance_number: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addCustomer.mutate()} disabled={!form.name}>Save Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
