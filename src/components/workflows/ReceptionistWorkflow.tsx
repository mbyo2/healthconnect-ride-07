import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Calendar, Clock, UserPlus, Search, Play, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useQueueTokens, QueueToken } from '@/hooks/useQueueTokens';
import { format } from 'date-fns';

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

  const TokenCard = ({ token }: { token: QueueToken }) => {
    const priority = PRIORITY_CONFIG[token.priority];
    return (
      <Card className="border-l-4" style={{ borderLeftColor: token.priority === 'emergency' ? 'hsl(var(--destructive))' : token.priority === 'urgent' ? '#f97316' : 'hsl(var(--primary))' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">{token.token_number}</span>
              <Badge variant={priority.badge} className="text-xs">{priority.label}</Badge>
            </div>
            <div className="flex gap-1">
              {token.status === 'waiting' && (
                <>
                  <Button size="sm" variant="default" onClick={() => updateTokenStatus(token.id, 'serving')}>
                    <Play className="h-3 w-3 mr-1" /> Call
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateTokenStatus(token.id, 'no_show')}>
                    No Show
                  </Button>
                </>
              )}
              {token.status === 'serving' && (
                <Button size="sm" variant="default" onClick={() => updateTokenStatus(token.id, 'completed')}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Front Office Dashboard</h1>
          <p className="text-muted-foreground">Patient registration, token queue & check-in management</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> New Token</Button>
          </DialogTrigger>
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
                    <SelectItem value="emergency">🔴 Emergency</SelectItem>
                    <SelectItem value="urgent">🟠 Urgent</SelectItem>
                    <SelectItem value="normal">🟢 Normal</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{waiting.length}</p>
            <p className="text-sm text-muted-foreground">Waiting</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-accent-foreground">{serving.length}</p>
            <p className="text-sm text-muted-foreground">Serving</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{completed.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-destructive">
              {waiting.filter(t => t.priority === 'emergency').length}
            </p>
            <p className="text-sm text-muted-foreground">Emergency</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Tabs */}
      <Tabs defaultValue="waiting">
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
    </div>
  );
};
