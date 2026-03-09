import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Wrench, AlertTriangle, CheckCircle, Settings, Loader2, Plus } from 'lucide-react';
import { format, differenceInDays, addDays, addMonths, isPast, isFuture } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface AssetWithMaintenance {
  id: string;
  asset_name: string;
  asset_tag: string | null;
  category: string;
  location: string | null;
  status: string;
  condition: string;
  purchase_date: string | null;
  warranty_expiry: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_interval_days: number | null;
}

interface MaintenanceSchedule {
  id: string;
  asset_id: string;
  schedule_type: 'preventive' | 'calibration' | 'inspection' | 'certification';
  frequency_days: number;
  last_completed: string | null;
  next_due: string;
  assigned_to: string | null;
  instructions: string | null;
  estimated_duration_hours: number | null;
}

const FREQUENCY_OPTIONS = [
  { value: 7, label: 'Weekly' },
  { value: 14, label: 'Bi-weekly' },
  { value: 30, label: 'Monthly' },
  { value: 90, label: 'Quarterly' },
  { value: 180, label: 'Semi-annually' },
  { value: 365, label: 'Annually' },
];

export const PreventiveMaintenanceScheduler: React.FC = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [assets, setAssets] = useState<AssetWithMaintenance[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [scheduleForm, setScheduleForm] = useState({
    schedule_type: 'preventive' as MaintenanceSchedule['schedule_type'],
    frequency_days: 30,
    instructions: '',
    estimated_duration_hours: 1,
  });

  useEffect(() => {
    if (institutionId) {
      fetchData();
    }
  }, [institutionId]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const [assetsRes, schedulesRes] = await Promise.all([
        (supabase.from('asset_register') as any).select('*').eq('institution_id', institutionId).order('asset_name'),
        (supabase.from('maintenance_schedules') as any).select('*').eq('institution_id', institutionId),
      ]);

      if (!assetsRes.error) setAssets(assetsRes.data || []);
      if (!schedulesRes.error) setSchedules(schedulesRes.data || []);
    } catch (err) {
      console.error('Maintenance data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!institutionId || !selectedAssetId) return;

    try {
      const nextDue = format(addDays(new Date(), scheduleForm.frequency_days), 'yyyy-MM-dd');

      const { error } = await (supabase.from('maintenance_schedules') as any).insert({
        institution_id: institutionId,
        asset_id: selectedAssetId,
        schedule_type: scheduleForm.schedule_type,
        frequency_days: scheduleForm.frequency_days,
        next_due: nextDue,
        instructions: scheduleForm.instructions || null,
        estimated_duration_hours: scheduleForm.estimated_duration_hours,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Maintenance schedule created');
      setShowAddDialog(false);
      fetchData();
      setScheduleForm({
        schedule_type: 'preventive',
        frequency_days: 30,
        instructions: '',
        estimated_duration_hours: 1,
      });
    } catch (err: any) {
      toast.error('Failed to create schedule: ' + err.message);
    }
  };

  const markCompleted = async (scheduleId: string, frequencyDays: number) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextDue = format(addDays(new Date(), frequencyDays), 'yyyy-MM-dd');

      const { error } = await (supabase.from('maintenance_schedules') as any).update({
        last_completed: today,
        next_due: nextDue,
        updated_at: new Date().toISOString(),
      }).eq('id', scheduleId);

      if (error) throw error;

      toast.success('Maintenance marked as completed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Calculate metrics
  const overdue = schedules.filter(s => isPast(new Date(s.next_due)));
  const dueSoon = schedules.filter(s => {
    const dueDate = new Date(s.next_due);
    const daysUntil = differenceInDays(dueDate, new Date());
    return daysUntil >= 0 && daysUntil <= 7;
  });
  const upcoming = schedules.filter(s => {
    const daysUntil = differenceInDays(new Date(s.next_due), new Date());
    return daysUntil > 7 && daysUntil <= 30;
  });

  const getAssetName = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? `${asset.asset_name} ${asset.asset_tag ? `(${asset.asset_tag})` : ''}` : assetId;
  };

  const getStatusBadge = (nextDue: string) => {
    const dueDate = new Date(nextDue);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (daysUntil < 0) {
      return <Badge variant="destructive">Overdue ({Math.abs(daysUntil)}d)</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-amber-100 text-amber-800">Due Soon ({daysUntil}d)</Badge>;
    } else {
      return <Badge variant="outline">{daysUntil}d remaining</Badge>;
    }
  };

  // Asset lifecycle health
  const getAssetHealth = (asset: AssetWithMaintenance) => {
    let score = 100;

    // Check warranty
    if (asset.warranty_expiry && isPast(new Date(asset.warranty_expiry))) {
      score -= 20;
    }

    // Check maintenance
    if (asset.next_maintenance_date && isPast(new Date(asset.next_maintenance_date))) {
      score -= 30;
    }

    // Check condition
    if (asset.condition === 'poor') score -= 30;
    else if (asset.condition === 'fair') score -= 15;

    return Math.max(0, score);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Preventive Maintenance</h2>
          <p className="text-muted-foreground">Schedule and track asset maintenance cycles</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Schedule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Maintenance Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Asset</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {assets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_name} {asset.asset_tag && `(${asset.asset_tag})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule Type</Label>
                <Select
                  value={scheduleForm.schedule_type}
                  onValueChange={v => setScheduleForm({ ...scheduleForm, schedule_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive Maintenance</SelectItem>
                    <SelectItem value="calibration">Calibration</SelectItem>
                    <SelectItem value="inspection">Safety Inspection</SelectItem>
                    <SelectItem value="certification">Certification Renewal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select
                  value={String(scheduleForm.frequency_days)}
                  onValueChange={v => setScheduleForm({ ...scheduleForm, frequency_days: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Duration (hours)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={scheduleForm.estimated_duration_hours}
                  onChange={e => setScheduleForm({ ...scheduleForm, estimated_duration_hours: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Instructions</Label>
                <Input
                  value={scheduleForm.instructions}
                  onChange={e => setScheduleForm({ ...scheduleForm, instructions: e.target.value })}
                  placeholder="Maintenance steps, checklist items..."
                />
              </div>
              <Button onClick={handleCreateSchedule} disabled={!selectedAssetId} className="w-full">
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-3xl font-bold text-destructive">{overdue.length}</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-3xl font-bold text-amber-600">{dueSoon.length}</p>
            <p className="text-sm text-muted-foreground">Due This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-3xl font-bold">{upcoming.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming (30d)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Settings className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-bold text-primary">{schedules.length}</p>
            <p className="text-sm text-muted-foreground">Total Schedules</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="schedules">
          <TabsList>
            <TabsTrigger value="schedules">Maintenance Schedules</TabsTrigger>
            <TabsTrigger value="lifecycle">Asset Lifecycle</TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-2 mt-4">
            {schedules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No maintenance schedules. Create one to start tracking.
                </CardContent>
              </Card>
            ) : (
              [...overdue, ...dueSoon, ...upcoming, ...schedules.filter(s => {
                const daysUntil = differenceInDays(new Date(s.next_due), new Date());
                return daysUntil > 30;
              })].slice(0, 20).map(schedule => (
                <Card key={schedule.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getAssetName(schedule.asset_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.schedule_type.replace('_', ' ')} • Every {schedule.frequency_days}d
                        {schedule.last_completed && ` • Last: ${format(new Date(schedule.last_completed), 'MMM d')}`}
                      </p>
                      {schedule.instructions && (
                        <p className="text-xs text-muted-foreground mt-1">{schedule.instructions}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(schedule.next_due)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markCompleted(schedule.id, schedule.frequency_days)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="lifecycle" className="space-y-2 mt-4">
            {assets.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No assets registered.
                </CardContent>
              </Card>
            ) : (
              assets.slice(0, 15).map(asset => {
                const health = getAssetHealth(asset);
                const hasWarranty = asset.warranty_expiry && isFuture(new Date(asset.warranty_expiry));

                return (
                  <Card key={asset.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{asset.asset_name} {asset.asset_tag && `(${asset.asset_tag})`}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.category} • {asset.location || 'N/A'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{asset.condition}</Badge>
                          {hasWarranty && <Badge className="bg-green-100 text-green-800">Under Warranty</Badge>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Health Score</span>
                          <span>{health}%</span>
                        </div>
                        <Progress
                          value={health}
                          className={`h-2 ${health < 50 ? '[&>div]:bg-destructive' : health < 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                        />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {asset.purchase_date && (
                          <span>Purchased: {format(new Date(asset.purchase_date), 'MMM yyyy')}</span>
                        )}
                        {asset.warranty_expiry && (
                          <span>Warranty: {format(new Date(asset.warranty_expiry), 'MMM yyyy')}</span>
                        )}
                        {asset.next_maintenance_date && (
                          <span>Next Maint: {format(new Date(asset.next_maintenance_date), 'MMM d')}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
