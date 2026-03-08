import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePromoCodes, useCreatePromoCode, useTogglePromoCode, type PromoCode } from "@/hooks/usePromoCodes";
import { Plus, Ticket, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const PromoCodeManager = () => {
  const { data: codes, isLoading } = usePromoCodes();
  const createPromo = useCreatePromoCode();
  const togglePromo = useTogglePromoCode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    promo_type: "one_time" as PromoCode["promo_type"],
    target_audience: "all",
    discount_type: "percentage",
    discount_value: 0,
    max_uses: undefined as number | undefined,
    valid_until: "",
    min_spend_amount: undefined as number | undefined,
    referrer_reward_amount: undefined as number | undefined,
    referrer_reward_type: "wallet_credit",
  });

  const handleCreate = async () => {
    if (!form.code || form.discount_value <= 0) {
      toast.error("Code and discount value are required");
      return;
    }
    await createPromo.mutateAsync({
      ...form,
      max_uses: form.max_uses || null,
      valid_until: form.valid_until || null,
      min_spend_amount: form.min_spend_amount || null,
      referrer_reward_amount: form.referrer_reward_amount || null,
    } as any);
    setOpen(false);
    setForm({ code: "", description: "", promo_type: "one_time", target_audience: "all", discount_type: "percentage", discount_value: 0, max_uses: undefined, valid_until: "", min_spend_amount: undefined, referrer_reward_amount: undefined, referrer_reward_type: "wallet_credit" });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied!");
  };

  const typeColors: Record<string, string> = {
    one_time: "bg-blue-100 text-blue-800",
    new_users_only: "bg-green-100 text-green-800",
    referral: "bg-purple-100 text-purple-800",
    multi_use: "bg-orange-100 text-orange-800",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Promo Codes</CardTitle>
          <CardDescription>Create and manage promotional codes</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Code</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input placeholder="e.g. WELCOME30" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="30% off first month" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.promo_type} onValueChange={v => setForm({ ...form, promo_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-Time Use</SelectItem>
                      <SelectItem value="new_users_only">New Users Only</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="multi_use">Multi-Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target</Label>
                  <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="patient">Patients Only</SelectItem>
                      <SelectItem value="provider">Providers Only</SelectItem>
                      <SelectItem value="institution">Institutions Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                      <SelectItem value="free_trial_days">Free Trial Days</SelectItem>
                      <SelectItem value="subscription_credit">Subscription Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value {form.discount_type === 'percentage' ? '(%)' : form.discount_type === 'free_trial_days' ? '(days)' : '(ZMW)'}</Label>
                  <Input type="number" value={form.discount_value || ""} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Max Uses (empty = unlimited)</Label>
                  <Input type="number" value={form.max_uses || ""} onChange={e => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <Label>Expires</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
                </div>
              </div>
              {form.promo_type === 'referral' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Min Spend by Referred (ZMW)</Label>
                    <Input type="number" value={form.min_spend_amount || ""} onChange={e => setForm({ ...form, min_spend_amount: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <Label>Referrer Reward (ZMW)</Label>
                    <Input type="number" value={form.referrer_reward_amount || ""} onChange={e => setForm({ ...form, referrer_reward_amount: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
              )}
              <Button onClick={handleCreate} disabled={createPromo.isPending} className="w-full">
                {createPromo.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Promo Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes?.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button onClick={() => copyCode(c.code)} className="flex items-center gap-1 font-mono font-bold text-sm hover:text-primary">
                        {c.code} <Copy className="h-3 w-3" />
                      </button>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={typeColors[c.promo_type]}>{c.promo_type.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="capitalize">{c.target_audience}</TableCell>
                    <TableCell>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` :
                       c.discount_type === 'free_trial_days' ? `${c.discount_value} days` :
                       `K${c.discount_value}`}
                    </TableCell>
                    <TableCell>{c.times_used}{c.max_uses ? `/${c.max_uses}` : '/∞'}</TableCell>
                    <TableCell>{c.valid_until ? format(new Date(c.valid_until), 'MMM d, yyyy') : 'Never'}</TableCell>
                    <TableCell>
                      <Switch checked={c.is_active} onCheckedChange={(v) => togglePromo.mutate({ id: c.id, is_active: v })} />
                    </TableCell>
                  </TableRow>
                ))}
                {!codes?.length && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No promo codes yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
