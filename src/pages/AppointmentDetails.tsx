import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, MapPin, Phone, Mail, Video, FileText, X, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingScreen } from '@/components/LoadingScreen';

interface AppointmentData {
  id: string;
  time_slot: {
    date: string;
    start_time: string;
    end_time: string;
  };
  patient: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  provider: {
    first_name: string;
    last_name: string;
    specialty?: string;
  };
  status: string;
  notes?: string;
  reason?: string;
  type: string;
}

const AppointmentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  useEffect(() => {
    if (showRescheduleDialog && appointment?.provider_id) {
      fetchAvailableSlots();
    }
  }, [showRescheduleDialog, appointment?.provider_id]);

  const fetchAvailableSlots = async () => {
    if (!appointment?.provider_id) return;
    setFetchingSlots(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('provider_time_slots')
        .select('*')
        .eq('provider_id', appointment.provider_id)
        .eq('status', 'available')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setFetchingSlots(false);
    }
  };

  const fetchAppointment = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          time_slot:provider_time_slots(*),
          patient:profiles!patient_id(first_name, last_name, email, phone),
          provider:profiles!provider_id(first_name, last_name, specialty)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setAppointment(data);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Error fetching appointment:', error);
      toast.error('Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const updateNotes = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;

      toast.success('Notes updated successfully');
      fetchAppointment();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const rescheduleAppointment = async () => {
    if (!id || !selectedSlotId) {
      toast.error('Please select a new time slot');
      return;
    }

    setRescheduling(true);
    try {
      // 1. Update the appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          time_slot_id: selectedSlotId,
          status: 'scheduled' // Reset status if it was something else
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Mark the new slot as booked
      const { error: slotError } = await supabase
        .from('provider_time_slots')
        .update({ status: 'booked' })
        .eq('id', selectedSlotId);

      if (slotError) throw slotError;

      // 3. Mark the old slot as available (if it exists)
      if (appointment.time_slot_id) {
        await supabase
          .from('provider_time_slots')
          .update({ status: 'available' })
          .eq('id', appointment.time_slot_id);
      }

      toast.success('Appointment rescheduled successfully');
      setShowRescheduleDialog(false);
      fetchAppointment();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  const cancelAppointment = async () => {
    if (!id || !cancelReason) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Appointment cancelled');
      setShowCancelDialog(false);
      navigate('/appointments');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: 'default',
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      no_show: 'destructive',
    };

    return <Badge variant={variants[status] || 'outline'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (loading) {
    return <LoadingScreen message="Loading appointment..." />;
  }

  if (!appointment) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Appointment not found</p>
            <Button className="mt-4" onClick={() => navigate('/appointments')}>
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Appointment Details</h1>
          <p className="text-muted-foreground">ID: {appointment.id.slice(0, 8)}</p>
        </div>
        {getStatusBadge(appointment.status)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Appointment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointment.time_slot.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.time_slot.start_time} - {appointment.time_slot.end_time}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Type</p>
                <p className="text-sm text-muted-foreground capitalize">{appointment.type}</p>
              </div>
            </div>

            {appointment.reason && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Reason</p>
                  <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient/Provider Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {appointment.patient ? 'Patient' : 'Provider'} Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Name</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.patient
                    ? `${appointment.patient.first_name} ${appointment.patient.last_name}`
                    : `${appointment.provider.first_name} ${appointment.provider.last_name}`}
                </p>
              </div>
            </div>

            {appointment.provider.specialty && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Specialty</p>
                  <p className="text-sm text-muted-foreground">{appointment.provider.specialty}</p>
                </div>
              </div>
            )}

            {appointment.patient?.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{appointment.patient.email}</p>
                </div>
              </div>
            )}

            {appointment.patient?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{appointment.patient.phone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Notes</CardTitle>
          <CardDescription>Add or update notes for this appointment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter notes about this appointment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
          />
          <Button onClick={updateNotes}>
            <Edit className="h-4 w-4 mr-2" />
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Actions */}
      {appointment.status === 'scheduled' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {appointment.type === 'video' && (
              <Button>
                <Video className="h-4 w-4 mr-2" />
                Join Video Call
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowRescheduleDialog(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Reschedule
            </Button>
            <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
              <X className="h-4 w-4 mr-2" />
              Cancel Appointment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Cancellation Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="schedule_conflict">Schedule Conflict</SelectItem>
                  <SelectItem value="no_longer_needed">No Longer Needed</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Appointment
            </Button>
            <Button variant="destructive" onClick={cancelAppointment}>
              Cancel Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment with Dr. {appointment.provider.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {fetchingSlots ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="space-y-2">
                <Label>Available Slots</Label>
                <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a new time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        {format(new Date(slot.date), 'MMM d')} at {slot.start_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No available slots found for this provider.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={rescheduleAppointment}
              disabled={!selectedSlotId || rescheduling}
            >
              {rescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetails;
