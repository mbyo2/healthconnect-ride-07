import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Plus, Clock, Bell, AlertTriangle, CheckCircle2, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date?: string;
  refill_date?: string;
  is_active: boolean;
  reminder_enabled: boolean;
  reminder_times: string[];
  prescriber?: string;
  prescription_id?: string;
}

const Medications = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    refill_date: '',
    reminder_enabled: false,
    reminder_times: ['09:00'],
  });

  const fetchMedications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data as any || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast.error('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [user]);

  const addMedication = async () => {
    if (!user || !newMedication.name || !newMedication.dosage) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase.from('medications' as any).insert({
        user_id: user.id,
        ...newMedication,
        is_active: true,
      });

      if (error) throw error;

      toast.success('Medication added successfully');
      setShowAddDialog(false);
      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        instructions: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        refill_date: '',
        reminder_enabled: false,
        reminder_times: ['09:00'],
      });
      fetchMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
    }
  };

  const toggleMedicationStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('medications' as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setMedications((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active: !currentStatus } : m))
      );
      toast.success(currentStatus ? 'Medication deactivated' : 'Medication activated');
    } catch (error) {
      console.error('Error updating medication:', error);
      toast.error('Failed to update medication');
    }
  };

  const filteredMedications = medications.filter((med) =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeMedications = filteredMedications.filter((m) => m.is_active);
  const inactiveMedications = filteredMedications.filter((m) => !m.is_active);
  const needsRefillSoon = medications.filter((m) => {
    if (!m.refill_date || !m.is_active) return false;
    const daysUntilRefill = Math.floor(
      (new Date(m.refill_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilRefill <= 7 && daysUntilRefill >= 0;
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Pill className="h-8 w-8 text-primary" />
            My Medications
          </h1>
          <p className="text-muted-foreground">
            {activeMedications.length} active medication{activeMedications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
              <DialogDescription>
                Add a medication to your list and set reminders.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Medication Name *</label>
                <Input
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  placeholder="e.g., Aspirin"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dosage *</label>
                <Input
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  placeholder="e.g., 100mg"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Frequency</label>
                <Select
                  value={newMedication.frequency}
                  onValueChange={(value) => setNewMedication({ ...newMedication, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Once daily">Once daily</SelectItem>
                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                    <SelectItem value="Three times daily">Three times daily</SelectItem>
                    <SelectItem value="Four times daily">Four times daily</SelectItem>
                    <SelectItem value="As needed">As needed</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Instructions</label>
                <Textarea
                  value={newMedication.instructions}
                  onChange={(e) => setNewMedication({ ...newMedication, instructions: e.target.value })}
                  placeholder="e.g., Take with food"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={newMedication.start_date}
                    onChange={(e) => setNewMedication({ ...newMedication, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={newMedication.end_date}
                    onChange={(e) => setNewMedication({ ...newMedication, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Refill Date</label>
                <Input
                  type="date"
                  value={newMedication.refill_date}
                  onChange={(e) => setNewMedication({ ...newMedication, refill_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={addMedication}>Add Medication</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Refill Alerts */}
      {needsRefillSoon.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Refill Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsRefillSoon.map((med) => (
                <div key={med.id} className="text-sm">
                  <strong>{med.name}</strong> needs refill in{' '}
                  {formatDistance(new Date(med.refill_date!), new Date())}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search medications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Medication Lists */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeMedications.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveMedications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeMedications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Pill className="h-12 w-12 mb-4 opacity-50" />
                <p>No active medications</p>
              </CardContent>
            </Card>
          ) : (
            activeMedications.map((med) => (
              <Card key={med.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{med.name}</CardTitle>
                      <CardDescription>{med.dosage} - {med.frequency}</CardDescription>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {med.instructions && (
                    <p className="text-sm text-muted-foreground">{med.instructions}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {med.reminder_enabled && (
                      <Badge variant="secondary">
                        <Bell className="h-3 w-3 mr-1" />
                        Reminders On
                      </Badge>
                    )}
                    {med.refill_date && (
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        Refill: {new Date(med.refill_date).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMedicationStatus(med.id, med.is_active)}
                    >
                      Mark Inactive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4 mt-4">
          {inactiveMedications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                <p>No inactive medications</p>
              </CardContent>
            </Card>
          ) : (
            inactiveMedications.map((med) => (
              <Card key={med.id} className="opacity-60">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{med.name}</CardTitle>
                      <CardDescription>{med.dosage} - {med.frequency}</CardDescription>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMedicationStatus(med.id, med.is_active)}
                  >
                    Reactivate
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Medications;
