import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface ShiftSchedule {
  id: string;
  staff_id: string;
  staff_name?: string;
  shift_date: string;
  shift_type: 'morning' | 'afternoon' | 'night' | 'full_day';
  start_time: string;
  end_time: string;
  department?: string;
  notes?: string;
}

const SHIFT_COLORS: Record<string, string> = {
  morning: 'bg-amber-100 text-amber-800 border-amber-300',
  afternoon: 'bg-blue-100 text-blue-800 border-blue-300',
  night: 'bg-purple-100 text-purple-800 border-purple-300',
  full_day: 'bg-green-100 text-green-800 border-green-300',
};

const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  morning: { start: '06:00', end: '14:00' },
  afternoon: { start: '14:00', end: '22:00' },
  night: { start: '22:00', end: '06:00' },
  full_day: { start: '08:00', end: '17:00' },
};

export const ShiftScheduleCalendar: React.FC = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [shiftForm, setShiftForm] = useState({
    staff_id: '',
    shift_type: 'morning' as ShiftSchedule['shift_type'],
    start_time: '06:00',
    end_time: '14:00',
    department: '',
    notes: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add padding days for calendar grid
  const startPadding = getDay(monthStart);
  const paddedDays = [...Array(startPadding).fill(null), ...days];

  useEffect(() => {
    if (!institutionId) return;
    fetchShifts();
  }, [institutionId, currentMonth]);

  const fetchShifts = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_schedules')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('shift_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('shift_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setShifts((data as unknown as ShiftSchedule[]) || []);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShift = async () => {
    if (!institutionId || !user || !selectedDate || !shiftForm.staff_id) return;

    try {
      const { error } = await supabase
        .from('shift_schedules')
        .insert({
          institution_id: institutionId,
          staff_id: shiftForm.staff_id,
          shift_date: format(selectedDate, 'yyyy-MM-dd'),
          shift_type: shiftForm.shift_type,
          start_time: shiftForm.start_time,
          end_time: shiftForm.end_time,
          department: shiftForm.department || null,
          notes: shiftForm.notes || null,
          created_by: user.id,
        } as any);

      if (error) throw error;

      toast.success('Shift scheduled');
      setShowAddDialog(false);
      fetchShifts();
      setShiftForm({
        staff_id: '',
        shift_type: 'morning',
        start_time: '06:00',
        end_time: '14:00',
        department: '',
        notes: '',
      });
    } catch (err: any) {
      toast.error('Failed to schedule shift: ' + err.message);
    }
  };

  const handleShiftTypeChange = (type: ShiftSchedule['shift_type']) => {
    setShiftForm({
      ...shiftForm,
      shift_type: type,
      start_time: SHIFT_TIMES[type].start,
      end_time: SHIFT_TIMES[type].end,
    });
  };

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter(s => s.shift_date === dateStr);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddDialog(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(SHIFT_COLORS).map(([type, color]) => (
                <Badge key={type} variant="outline" className={color}>
                  {type.replace('_', ' ')}
                </Badge>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {paddedDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[80px] p-1 border rounded-lg transition-colors ${
                    day === null
                      ? 'bg-transparent border-transparent'
                      : isToday(day)
                        ? 'bg-primary/10 border-primary'
                        : isSameMonth(day, currentMonth)
                          ? 'bg-background hover:bg-muted cursor-pointer'
                          : 'bg-muted/30 text-muted-foreground'
                  }`}
                  onClick={() => day && handleDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="text-xs font-medium mb-1">{format(day, 'd')}</div>
                      <div className="space-y-0.5">
                        {getShiftsForDay(day).slice(0, 3).map(shift => (
                          <div
                            key={shift.id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${SHIFT_COLORS[shift.shift_type]}`}
                            title={`${shift.staff_id} - ${shift.shift_type}`}
                          >
                            {shift.staff_id.slice(0, 6)}
                          </div>
                        ))}
                        {getShiftsForDay(day).length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{getShiftsForDay(day).length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add Shift Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Schedule Shift - {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Staff ID</Label>
                <Input
                  value={shiftForm.staff_id}
                  onChange={e => setShiftForm({ ...shiftForm, staff_id: e.target.value })}
                  placeholder="Employee ID"
                />
              </div>
              <div>
                <Label>Shift Type</Label>
                <Select value={shiftForm.shift_type} onValueChange={handleShiftTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (06:00 - 14:00)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (14:00 - 22:00)</SelectItem>
                    <SelectItem value="night">Night (22:00 - 06:00)</SelectItem>
                    <SelectItem value="full_day">Full Day (08:00 - 17:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={shiftForm.start_time}
                    onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={shiftForm.end_time}
                    onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  value={shiftForm.department}
                  onChange={e => setShiftForm({ ...shiftForm, department: e.target.value })}
                  placeholder="e.g., Emergency, ICU"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={shiftForm.notes}
                  onChange={e => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <Button onClick={handleAddShift} disabled={!shiftForm.staff_id} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Shift
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
