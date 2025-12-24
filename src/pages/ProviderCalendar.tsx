import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, Plus, X, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, addWeeks, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface TimeSlot {
  id: string;
  provider_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
}

interface Appointment {
  id: string;
  time_slot_id: string;
  patient_name: string;
  patient_id: string;
  status: string;
  notes?: string;
}

const ProviderCalendar = () => {
  const { user } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '09:30',
    is_recurring: false,
    recurrence_pattern: 'weekly',
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const timeSlots24h = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch time slots for the current week
      const weekEnd = addDays(currentWeekStart, 7);
      const { data: slotsData, error: slotsError } = await supabase
        .from('provider_time_slots' as any)
        .select('*')
        .eq('provider_id', user.id)
        .gte('date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lt('date', format(weekEnd, 'yyyy-MM-dd'));

      if (slotsError) throw slotsError;

      // Fetch appointments for these time slots
      const slotIds = slotsData?.map((s) => s.id) || [];
      let appointmentsData = [];

      if (slotIds.length > 0) {
        const { data: apptData, error: apptError } = await supabase
          .from('appointments' as any)
          .select(`
            *,
            patient:profiles!patient_id(first_name, last_name)
          `)
          .in('time_slot_id', slotIds)
          .neq('status', 'cancelled');

        if (apptError) throw apptError;
        appointmentsData = apptData || [];
      }

      setTimeSlots(slotsData || []);
      setAppointments(
        appointmentsData.map((a: any) => ({
          ...a,
          patient_name: `${a.patient?.first_name || ''} ${a.patient?.last_name || ''}`.trim(),
        }))
      );
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, currentWeekStart]);

  const addTimeSlot = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('provider_time_slots' as any).insert({
        provider_id: user.id,
        ...newSlot,
        is_available: true,
      });

      if (error) throw error;

      toast.success('Time slot added successfully');
      setShowAddSlotDialog(false);
      setNewSlot({
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '09:30',
        is_recurring: false,
        recurrence_pattern: 'weekly',
      });
      fetchData();
    } catch (error) {
      console.error('Error adding time slot:', error);
      toast.error('Failed to add time slot');
    }
  };

  const toggleSlotAvailability = async (slotId: string, currentAvailability: boolean) => {
    try {
      const { error } = await supabase
        .from('provider_time_slots' as any)
        .update({ is_available: !currentAvailability })
        .eq('id', slotId);

      if (error) throw error;

      setTimeSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, is_available: !currentAvailability } : s))
      );
      toast.success(currentAvailability ? 'Slot blocked' : 'Slot opened');
    } catch (error) {
      console.error('Error toggling slot:', error);
      toast.error('Failed to update slot');
    }
  };

  const deleteSlot = async (slotId: string) => {
    // Check if slot has appointments
    const hasAppointment = appointments.some((a) => a.time_slot_id === slotId);
    if (hasAppointment) {
      toast.error('Cannot delete slot with existing appointments');
      return;
    }

    try {
      const { error } = await supabase.from('provider_time_slots' as any).delete().eq('id', slotId);

      if (error) throw error;

      setTimeSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success('Time slot deleted');
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete slot');
    }
  };

  const getSlotForDateTime = (date: Date, time: string) => {
    return timeSlots.find(
      (slot) =>
        isSameDay(new Date(slot.date), date) &&
        slot.start_time === time
    );
  };

  const getAppointmentForSlot = (slotId: string) => {
    return appointments.find((a) => a.time_slot_id === slotId);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            My Calendar
          </h1>
          <p className="text-muted-foreground">
            Week of {format(currentWeekStart, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
          >
            Previous Week
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            Next Week
          </Button>
        </div>
      </div>

      {/* Add Slot Button */}
      <Dialog open={showAddSlotDialog} onOpenChange={setShowAddSlotDialog}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>Create a new available time slot for appointments</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newSlot.date}
                onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Recurring</Label>
              <Switch
                checked={newSlot.is_recurring}
                onCheckedChange={(checked) => setNewSlot({ ...newSlot, is_recurring: checked })}
              />
            </div>
            {newSlot.is_recurring && (
              <div>
                <Label>Pattern</Label>
                <Select
                  value={newSlot.recurrence_pattern}
                  onValueChange={(value) => setNewSlot({ ...newSlot, recurrence_pattern: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddSlotDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addTimeSlot}>Add Slot</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 border-b bg-muted/50">
                <div className="p-2 font-medium text-sm">Time</div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="p-2 text-center">
                    <div className="font-medium">{format(day, 'EEE')}</div>
                    <div className="text-sm text-muted-foreground">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              <div className="divide-y">
                {timeSlots24h.slice(8, 20).map((time) => (
                  <div key={time} className="grid grid-cols-8">
                    <div className="p-2 text-sm font-medium border-r bg-muted/30">{time}</div>
                    {weekDays.map((day) => {
                      const slot = getSlotForDateTime(day, time);
                      const appointment = slot ? getAppointmentForSlot(slot.id) : null;

                      return (
                        <div
                          key={`${day.toISOString()}-${time}`}
                          className={`p-1 border-r min-h-[60px] ${slot
                            ? appointment
                              ? 'bg-primary/10'
                              : slot.is_available
                                ? 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30'
                                : 'bg-red-50 dark:bg-red-950/20'
                            : 'hover:bg-accent/50'
                            }`}
                        >
                          {slot ? (
                            <div className="space-y-1">
                              {appointment ? (
                                <div className="text-xs">
                                  <Badge variant="default" className="text-xs">
                                    {appointment.patient_name}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-xs p-1"
                                    onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}
                                  >
                                    {slot.is_available ? 'Block' : 'Open'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 p-1"
                                    onClick={() => deleteSlot(slot.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 dark:bg-green-950/20 border" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 dark:bg-red-950/20 border" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border" />
            <span>Booked</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderCalendar;