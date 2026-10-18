import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, Clock, UserPlus, Search, Play, CheckCircle, XCircle, AlertTriangle, Loader2, ChevronRight, ClipboardList } from 'lucide-react';
import { useQueueTokens, QueueToken } from '@/hooks/useQueueTokens';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { format } from 'date-fns';

interface ActionItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface ActionGroup {
  title: string;
  primary: ActionItem;
  secondary: ActionItem[];
}

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', color: 'bg-destructive text-destructive-foreground', badge: 'destructive' as const },
  urgent: { label: 'Urgent', color: 'bg-orange-500 text-white', badge: 'default' as const },
  normal: { label: 'Normal', color: 'bg-primary text-primary-foreground', badge: 'secondary' as const },
  low: { label: 'Low', color: 'bg-muted text-muted-foreground', badge: 'outline' as const },
};

const STATUS_CONFIG = {
  waiting: { label: 'Waiting', icon: <Clock className="h-4 w-4" /> },
  serving: { label: 'Serving', icon: <Play className="h-4 w-4" /> },
  completed: { label: 'Done', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', icon: <XCircle className="h-4 w-4" /> },
  no_show: { label: 'No Show', icon: <XCircle className="h-4 w-4" /> },
};

const DEPARTMENTS = ['General', 'OPD', 'Emergency', 'Pediatrics', 'Gynecology', 'Orthopedics', 'ENT', 'Ophthalmology', 'Cardiology', 'Dermatology'];

export const ReceptionistWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const { tokens, loading, waiting, serving, completed, createToken, updateTokenStatus } = useQueueTokens();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: '',
    department: 'General',
    priority: 'normal' as QueueToken['priority'],
    notes: '',
  });
  const [creating, setCreating] = useState(false);

  const handleCreateToken = async () => {
    if (!formData.patient_name.trim()) return;
    setCreating(true);
    const result = await createToken(formData);
    if (result) {
      setFormData({ patient_name: '', department: 'General', priority: 'normal', notes: '' });
      setIsDialogOpen(false);
    }
    setCreating(false);
  };

  const icon = (Icon: React.ElementType) => <Icon className="h-5 w-5" />;
  const openDialog = () => setIsDialogOpen(true);

  const groups: ActionGroup[] = [
    {
      title: 'Front Desk',
      primary: { title: 'New Token', description: 'Check in a patient & generate queue token', icon: icon(UserPlus), action: openDialog },
      secondary: [
        { title: 'Patient Registration', description: 'Register a new patient record', icon: icon(ClipboardList), action: () => { navigate('/patient-registration'); showSuccess({ message: 'Opening Patient Registration...' }); } },
        { title: 'Find Patient', description: 'Search existing patients', icon: icon(Search), action: () => { navigate('/search'); showSuccess({ message: 'Opening Patient Search...' }); } },
      ],
    },
    {
      title: 'Schedule',
      primary: { title: 'Appointments', description: "Today's bookings & scheduling", icon: icon(Calendar), action: () => { navigate('/appointments'); showSuccess({ message: 'Opening Appointments...' }); } },
      secondary: [],
    },
  ];

  const emergencyCount = waiting.filter(t => t.priority === 'emergency').length;

  const TokenCard = ({ token }: { token: QueueToken }) => {
    const priority = PRIORITY_CONFIG[token.priority];
    return (
      <Card className="border-l-4" style={{ borderLeftColor: token.priority === 'emergency' ? 'hsl(var(--destructive))' : token.priority === 'urgent' ? '#f97316' : 'hsl(var(--primary))' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground tabular-nums">{token.token_number}</span>
              <Badge variant={priority.badge} className="text-xs">{priority.label}</Badge>
            </div>
            <div className="flex gap-1">
              {token.status === 'waiting' && (
                <>
                  <Button size="touch" variant="default" onClick={() => updateTokenStatus(token.id, 'serving')}>
                    <Play className="h-3 w-3 mr-1" /> Call
                  </Button>
                  <Button size="touch" variant="outline" onClick={() => updateTokenStatus(token.id, 'no_show')}>
                    No Show
                  </Button>
                </>
              )}
              {token.status === 'serving' && (
                <Button size="touch" variant="default" onClick={() => updateTokenStatus(token.id, 'completed')}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Complete
                </Button>
              )}
            </div>
          </div>
          <p className="font-medium text-foreground">{token.patient_name}</p>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{token.department}</span>
            <span>•</span>
            <span>{format(new Date(token.check_in_time), 'HH:mm')}</span>
            {token.serving_start_time && (
              <>
                <span>•</span>
                <span>Called at {format(new Date(token.serving_start_time), 'HH:mm')}</span>
              </>
            )}
          </div>
          {token.notes && <p className="text-xs text-muted-foreground mt-1">{token.notes}</p>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-md">
          <Users className="h-7 w-7" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Front Office Workspace</p>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Reception Dashboard</h1>
        </div>
      </div>

      {/* Today at a Glance */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Today at a glance</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary-500 p-5 text-left text-white shadow-sm">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 opacity-80" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none">{loading ? '–' : waiting.length}</p>
            <p className="mt-1 text-[15px] font-medium">Waiting in queue</p>
            <p className="text-[13px] opacity-80">Patients checked in</p>
          </div>

          <div className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <Play className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{loading ? '–' : serving.length}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Now serving</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">With clinicians</p>
          </div>

          <div className="rounded-2xl border border-canvas-silk bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <p className="mt-3 text-[28px] font-bold leading-none text-slate-900 dark:text-white">{loading ? '–' : emergencyCount}</p>
            <p className="mt-1 text-[15px] font-medium text-slate-900 dark:text-white">Emergency</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Priority patients waiting</p>
          </div>
        </div>
      </section>

      {/* Grouped Actions */}
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <div className="rounded-2xl border border-canvas-silk bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={group.primary.action}
              className="flex w-full items-center gap-4 border-b border-canvas-silk p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white">
                {group.primary.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-slate-900 dark:text-white">{group.primary.title}</p>
                <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{group.primary.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
            {group.secondary.length > 0 && (
              <div className="divide-y divide-canvas-silk dark:divide-slate-800">
                {group.secondary.map((item) => (
                  <button
                    key={item.title}
                    onClick={item.action}
                    className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {/* Queue Workspace */}
      <section>
        <h2 className="mb-4 text-[18px] font-semibold text-slate-900 dark:text-white">Live Queue</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Queue Token</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Patient Name *</Label>
                <Input
                  value={formData.patient_name}
                  onChange={e => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={formData.department} onValueChange={v => setFormData(prev => ({ ...prev, department: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(prev => ({ ...prev, priority: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" aria-hidden /> Emergency</span></SelectItem>
                    <SelectItem value="urgent"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden /> Urgent</span></SelectItem>
                    <SelectItem value="normal"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Normal</span></SelectItem>
                    <SelectItem value="low"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden /> Low</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
              <Button onClick={handleCreateToken} disabled={creating || !formData.patient_name.trim()} className="w-full">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Generate Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <Tabs defaultValue="waiting" className="mt-1">
        <TabsList>
          <TabsTrigger value="waiting">
            <Clock className="h-4 w-4 mr-1" /> Waiting ({waiting.length})
          </TabsTrigger>
          <TabsTrigger value="serving">
            <Play className="h-4 w-4 mr-1" /> Serving ({serving.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4 mr-1" /> Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waiting" className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : waiting.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No patients waiting. Click "New Token" to check in a patient.</p>
              </CardContent>
            </Card>
          ) : (
            waiting.map(token => <TokenCard key={token.id} token={token} />)
          )}
        </TabsContent>

        <TabsContent value="serving" className="space-y-3 mt-4">
          {serving.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>No patients currently being served.</p>
              </CardContent>
            </Card>
          ) : (
            serving.map(token => <TokenCard key={token.id} token={token} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <p>No completed tokens today.</p>
              </CardContent>
            </Card>
          ) : (
            completed.map(token => <TokenCard key={token.id} token={token} />)
          )}
        </TabsContent>
      </Tabs>
      </section>
    </div>
  );
};
