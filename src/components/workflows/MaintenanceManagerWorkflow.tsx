import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, AlertTriangle, Settings, Plus, Loader2, Package, Calendar, Building2 } from 'lucide-react';
import { useMaintenanceModule } from '@/hooks/useMaintenanceModule';
import { PreventiveMaintenanceScheduler } from '@/components/maintenance/PreventiveMaintenanceScheduler';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const MaintenanceManagerWorkflow = () => {
  const { workOrders, assets, loading, openOrders, criticalOrders, createWorkOrder, updateWorkOrder, addAsset, updateAsset, realtimeLive } = useMaintenanceModule();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareAsset, setShareAsset] = useState<any>(null);
  const [shareTerms, setShareTerms] = useState('');
  const [shareRate, setShareRate] = useState('');

  const openShareDialog = (a: any) => {
    setShareAsset(a);
    setShareTerms(a.share_terms || '');
    setShareRate(a.share_rate != null ? String(a.share_rate) : '');
    setShowShareDialog(true);
  };

  const saveShare = async (enable: boolean) => {
    if (!shareAsset) return;
    try {
      await updateAsset(shareAsset.id, {
        is_shareable: enable,
        share_terms: enable ? (shareTerms.trim() || null) : shareAsset.share_terms,
        share_rate: enable ? (shareRate.trim() === '' ? null : Number(shareRate)) : shareAsset.share_rate,
      });
      toast.success(enable ? `"${shareAsset.asset_name}" is now shareable with other institutions` : `Sharing turned off for "${shareAsset.asset_name}"`);
      setShowShareDialog(false);
    } catch { /* toast already shown */ }
  };
  const [showAddWO, setShowAddWO] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [woForm, setWoForm] = useState({ title: '', description: '', category: 'general', priority: 'medium', location: '', assigned_to_name: '' });
  const [assetForm, setAssetForm] = useState({ asset_name: '', asset_tag: '', category: 'medical_equipment', location: '', manufacturer: '', serial_number: '' });

  const priorityColor = (p: string) => {
    switch (p) { case 'critical': return 'bg-destructive/10 text-destructive'; case 'high': return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'; default: return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Maintenance & Facilities
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${realtimeLive ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${realtimeLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50"}`} />
              {realtimeLive ? "Live" : "Connecting…"}
            </span>
          </h1>
          <p className="text-muted-foreground">Work orders, asset register & vendor management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1" asChild>
            <Link to="/shared-equipment"><Building2 className="h-4 w-4" /> Shared Equipment</Link>
          </Button>
          <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
            <DialogTrigger asChild><Button variant="outline" className="gap-1"><Package className="h-4 w-4" /> Register Asset</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register Asset</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Asset Name</Label><Input value={assetForm.asset_name} onChange={e => setAssetForm({...assetForm, asset_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Tag/ID</Label><Input value={assetForm.asset_tag} onChange={e => setAssetForm({...assetForm, asset_tag: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Category</Label>
                    <Select value={assetForm.category} onValueChange={v => setAssetForm({...assetForm, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical_equipment">Medical Equipment</SelectItem><SelectItem value="hvac">HVAC</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem><SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="it_network">IT/Network</SelectItem><SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="biomedical">Biomedical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Location</Label><Input value={assetForm.location} onChange={e => setAssetForm({...assetForm, location: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Manufacturer</Label><Input value={assetForm.manufacturer} onChange={e => setAssetForm({...assetForm, manufacturer: e.target.value})} /></div>
                </div>
                <div className="space-y-1"><Label>Serial Number</Label><Input value={assetForm.serial_number} onChange={e => setAssetForm({...assetForm, serial_number: e.target.value})} /></div>
                <Button className="w-full" onClick={async () => { await addAsset(assetForm as any); setShowAddAsset(false); }}>Register</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showAddWO} onOpenChange={setShowAddWO}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Work Order</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Title</Label><Input value={woForm.title} onChange={e => setWoForm({...woForm, title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Category</Label>
                    <Select value={woForm.category} onValueChange={v => setWoForm({...woForm, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electrical">Electrical</SelectItem><SelectItem value="plumbing">Plumbing</SelectItem>
                        <SelectItem value="hvac">HVAC</SelectItem><SelectItem value="medical_equipment">Medical Equip</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem><SelectItem value="it_network">IT/Network</SelectItem>
                        <SelectItem value="biomedical">Biomedical</SelectItem><SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Priority</Label>
                    <Select value={woForm.priority} onValueChange={v => setWoForm({...woForm, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Location</Label><Input value={woForm.location} onChange={e => setWoForm({...woForm, location: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Assign To</Label><Input value={woForm.assigned_to_name} onChange={e => setWoForm({...woForm, assigned_to_name: e.target.value})} /></div>
                </div>
                <div className="space-y-1"><Label>Description</Label><Textarea value={woForm.description} onChange={e => setWoForm({...woForm, description: e.target.value})} rows={3} /></div>
                <Button className="w-full" onClick={async () => { await createWorkOrder(woForm as any); setShowAddWO(false); }}>Submit</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Wrench className="h-5 w-5 text-primary" /> Open Orders</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{openOrders.length}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Critical</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{criticalOrders.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-5 w-5" /> Assets</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{assets.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="work_orders">
        <TabsList><TabsTrigger value="work_orders">Work Orders</TabsTrigger><TabsTrigger value="assets">Asset Register</TabsTrigger><TabsTrigger value="preventive"><Calendar className="h-4 w-4 mr-1" /> Preventive</TabsTrigger></TabsList>
        <TabsContent value="work_orders">
          <Card>
            <CardContent className="pt-4">
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
                workOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-1">No work orders yet</p>
                    <p className="text-sm text-muted-foreground mb-4">Log maintenance requests so nothing falls through the cracks.</p>
                    <Button onClick={() => setShowAddWO(true)} className="gap-1.5 min-h-[44px]"><Plus className="h-4 w-4" /> Create Work Order</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workOrders.map(wo => (
                      <div key={wo.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{wo.title}</p>
                          <p className="text-sm text-muted-foreground">{wo.category} • {wo.location || 'N/A'} • {wo.assigned_to_name || 'Unassigned'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={priorityColor(wo.priority)}>{wo.priority}</Badge>
                          <Badge variant="outline">{wo.status}</Badge>
                          {wo.status === 'open' && <Button size="sm" variant="outline" onClick={() => updateWorkOrder(wo.id, { status: 'in_progress', started_at: new Date().toISOString() })}>Start</Button>}
                          {wo.status === 'in_progress' && <Button size="sm" onClick={() => updateWorkOrder(wo.id, { status: 'completed', completed_at: new Date().toISOString() })}>Complete</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="assets">
          <Card>
            <CardContent className="pt-4">
              {assets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-1">No assets registered yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Register equipment to track condition, maintenance and sharing.</p>
                  <Button onClick={() => setShowAddAsset(true)} className="gap-1.5 min-h-[44px]"><Package className="h-4 w-4" /> Register Asset</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className="font-medium flex items-center gap-2 flex-wrap">{a.asset_name} {a.asset_tag ? `(${a.asset_tag})` : ''}
                          {a.is_shareable && <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">Shared</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground">{a.category} • {a.location || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{a.status}</Badge>
                        <Badge variant="outline">{a.condition}</Badge>
                        {a.status === 'operational' && (
                          <Button size="sm" variant={a.is_shareable ? "outline" : "secondary"} onClick={() => openShareDialog(a)}>
                            {a.is_shareable ? 'Sharing…' : 'Share'}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="preventive" className="mt-4">
          <PreventiveMaintenanceScheduler />
        </TabsContent>
      </Tabs>

      {/* Share machine with other institutions */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share "{shareAsset?.asset_name}"</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Other verified institutions will see this machine in the Shared Equipment directory
            (name, location and terms only — never your costs or internal notes) and can request usage.
          </p>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Terms of use</Label><Textarea value={shareTerms} onChange={e => setShareTerms(e.target.value)} rows={3} placeholder="e.g. Weekdays 8:00–17:00, operator included, 48h notice required" /></div>
            <div className="space-y-1"><Label>Usage fee (K, optional)</Label><Input value={shareRate} onChange={e => setShareRate(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0 = free" /></div>
          </div>
          <div className="flex gap-2">
            {shareAsset?.is_shareable ? (
              <Button variant="outline" className="flex-1" onClick={() => saveShare(false)}>Stop sharing</Button>
            ) : (
              <Button className="flex-1" onClick={() => saveShare(true)}>Share machine</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
