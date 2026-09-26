import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video, Building2, ChevronLeft, ChevronRight, Check, Loader2, Bell, UserPlus, UserCheck } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import { Provider } from "@/types/provider";
import { providerDisplayName } from "@/utils/providerDisplay";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WaitlistSignup } from "./WaitlistSignup";
import { CostBreakdown } from "./CostBreakdown";
import { FlowResult } from "@/components/ui/flow-result";
import {
  savePendingAction,
  takePendingAction,
  peekPendingAction,
  authRedirectUrl,
  currentReturnTo,
} from "@/utils/pendingAction";

interface BookingModalProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
  /** Called when a saved pre-login booking is ready to resume (parent opens the modal). */
  onRequestOpen?: () => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00"
];

export const BookingModal = ({ provider, isOpen, onClose, onRequestOpen }: BookingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'visit' | 'type' | 'datetime' | 'confirm'>('visit');
  const [visitType, setVisitType] = useState<'new' | 'returning'>('new');
  const [appointmentType, setAppointmentType] = useState<'physical' | 'virtual'>('physical');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [showWaitlist, setShowWaitlist] = useState(false);

  // Fetch booked slots for this provider
  useEffect(() => {
    if (!isOpen || !provider?.id) return;
    
    const fetchBookedSlots = async () => {
      // Scope to the bookable window (today → +120 days). Without a date
      // bound this pulled the provider's ENTIRE appointment history just to
      // render availability for the current week. `date` is a DATE column.
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const horizonStr = format(addDays(new Date(), 120), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('date, time')
        .eq('provider_id', provider.id)
        .in('status', ['scheduled', 'confirmed'])
        .gte('date', todayStr)
        .lte('date', horizonStr);

      if (data) {
        // Postgres TIME comes back as "HH:MM:SS" while TIME_SLOTS are "HH:MM" —
        // normalize so already-booked slots actually render as booked.
        setBookedSlots(data.map(a => `${a.date}-${String(a.time).slice(0, 5)}`));
      }
    };
    
    fetchBookedSlots();
  }, [isOpen, provider?.id]);

  const isSlotBooked = (date: Date, time: string) => {
    return bookedSlots.includes(`${format(date, 'yyyy-MM-dd')}-${time}`);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));

  // A changed selection invalidates the previous failure.
  useEffect(() => {
    setSubmitError(null);
  }, [selectedDate, selectedTime]);

  // Resume a booking started before login: restore selections and reopen
  // at the confirm step. Nothing is created until the user confirms.
  useEffect(() => {
    if (isOpen || !user || !provider?.id || !onRequestOpen) return;
    const pending = peekPendingAction();
    if (pending?.kind === 'booking' && pending.providerId === provider.id) {
      takePendingAction();
      setVisitType(pending.visitType);
      setAppointmentType(pending.appointmentType);
      const restoredDate = pending.date ? new Date(`${pending.date}T00:00:00`) : null;
      setSelectedDate(restoredDate);
      if (restoredDate) setWeekStart(startOfWeek(restoredDate, { weekStartsOn: 1 }));
      setSelectedTime(pending.time);
      setReason(pending.reason || '');
      setStep('confirm');
      onRequestOpen();
      toast.success('Welcome back — your booking details were kept. Review and confirm.');
    }
  }, [isOpen, user, provider?.id, onRequestOpen]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please complete all booking details");
      return;
    }
    if (!user) {
      // Auth wall: stash the intent so login drops the user back here and
      // the booking resumes — never silently drop it behind a toast.
      savePendingAction({
        kind: 'booking',
        providerId: provider.id,
        visitType,
        appointmentType,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        reason,
        returnTo: currentReturnTo(),
        createdAt: Date.now(),
      });
      toast.info('Sign in to finish booking — your details are saved.');
      navigate(authRedirectUrl(currentReturnTo()));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: booked, error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        provider_id: provider.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: appointmentType === 'virtual' ? 'video_consultation' : 'in_person',
        status: 'scheduled',
        notes: reason || null,
        duration: visitType === 'new' ? 45 : 30,
        patient_visit_type: visitType
      }).select('id').single();

      if (error) throw error;

      // Pay-per-new-booking model: the database trigger
      // trg_charge_booking_fee (on appointments) is the single source of
      // truth for fee creation — it atomically records exactly one pending
      // booking fee for genuine first-time patients (settled against the
      // provider's wallet/plan, never charged to the patient). No manual
      // insert here: a second insert would double-charge the provider.

      // Dispatch the confirmation reminder (in-app notification). Non-blocking
      // and silent on failure — the booking itself already succeeded.
      if (booked?.id) {
        supabase.functions.invoke('send-appointment-reminder', {
          body: { appointment_id: booked.id },
        }).catch((reminderErr) => {
          console.error('Reminder dispatch failed (non-fatal):', reminderErr);
        });
      }

      toast.success("Appointment booked successfully!");
      onClose();
      if (booked?.id) {
        navigate(`/booking-confirmed?id=${booked.id}`);
      } else {
        navigate('/appointments');
      }
    } catch (error) {
      console.error('Booking error:', error);
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't create your appointment. Your details are safe — try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep('visit')} className="mb-2 h-11">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
      <div className="text-center pb-4 border-b border-border">
        <div className="flex items-center justify-center gap-3 mb-2">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {provider.first_name?.[0]}{provider.last_name?.[0]}
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {providerDisplayName(provider as any)}
        </h3>
        <p className="text-sm text-muted-foreground">{provider.specialty}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-4 text-foreground">Select appointment type</h4>
        <RadioGroup value={appointmentType} onValueChange={(v) => setAppointmentType(v as 'physical' | 'virtual')}>
          <div 
            className={cn(
              "flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              appointmentType === 'physical' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setAppointmentType('physical')}
          >
            <RadioGroupItem value="physical" id="physical" />
            <Label htmlFor="physical" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">In-Person Visit</p>
                  <p className="text-xs text-muted-foreground">Visit the clinic for consultation</p>
                </div>
              </div>
            </Label>
            {(provider.primary_practice_location || provider.location || provider.address) && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {provider.primary_practice_location || provider.location || provider.city || 'Clinic'}
              </Badge>
            )}
          </div>

          <div 
            className={cn(
              "flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all mt-3",
              appointmentType === 'virtual' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setAppointmentType('virtual')}
          >
            <RadioGroupItem value="virtual" id="virtual" />
            <Label htmlFor="virtual" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Video className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Video Consultation</p>
                  <p className="text-xs text-muted-foreground">Connect online via video call</p>
                </div>
              </div>
            </Label>
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700">
              Available Now
            </Badge>
          </div>
        </RadioGroup>
      </div>

      <Button className="w-full" size="lg" onClick={() => setStep('datetime')}>
        Continue
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderDateTimeSelection = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep('type')} className="mb-2 h-11">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Week Navigation */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Select a date
          </h4>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11"
              onClick={handlePrevWeek}
              disabled={isBefore(weekStart, today)}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[120px] text-center">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleNextWeek} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isPast = isBefore(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            
            return (
              <button
                key={day.toISOString()}
                disabled={isPast}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "p-2 rounded-xl text-center transition-all min-h-[56px] flex flex-col items-center justify-center",
                  isPast && "opacity-40 cursor-not-allowed",
                  isSelected && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  !isSelected && !isPast && "bg-muted hover:bg-primary/10 cursor-pointer",
                  isToday && !isSelected && "ring-2 ring-primary/30"
                )}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-bold">{format(day, 'd')}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-medium mb-4 text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Available times for {format(selectedDate, 'EEEE, MMM d')}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map((time) => {
              const isBooked = isSlotBooked(selectedDate, time);
              const isSelected = selectedTime === time;
              
              return (
                <button
                  key={time}
                  disabled={isBooked}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium transition-all",
                    isBooked && "bg-muted text-muted-foreground line-through cursor-not-allowed",
                    isSelected && "bg-primary text-primary-foreground",
                    !isBooked && !isSelected && "bg-muted hover:bg-primary/10 cursor-pointer"
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Button 
        className="w-full" 
        size="lg" 
        onClick={() => setStep('confirm')}
        disabled={!selectedDate || !selectedTime}
      >
        Continue
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setStep('datetime')} className="mb-2 h-11">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="bg-muted/50 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-foreground">Appointment Summary</h4>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {provider.avatar_url ? (
              <img src={provider.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {provider.first_name?.[0]}{provider.last_name?.[0]}
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{providerDisplayName(provider as any)}</p>
              <p className="text-sm text-muted-foreground">{provider.specialty}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{selectedDate && format(selectedDate, 'EEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{selectedTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            {appointmentType === 'virtual' ? (
              <>
                <Video className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-foreground">Video Consultation</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-foreground">{provider.address || 'In-Person Visit'}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <CostBreakdown
        appointmentType={appointmentType}
        visitType={visitType}
        specialty={provider.specialty}
        feeMin={provider.consultation_fee_min}
        feeMax={provider.consultation_fee_max}
      />

      <div>
        <Label htmlFor="reason" className="text-sm font-medium">
          Reason for visit (optional)
        </Label>
        <Textarea
          id="reason"
          placeholder="Briefly describe your symptoms or reason for the appointment..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2"
          rows={3}
        />
      </div>

      {submitError && (
        <FlowResult
          status="error"
          title="Booking didn't go through"
          description={submitError}
          onRetry={handleSubmit}
          retryLabel="Try Booking Again"
        />
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Booking...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Confirm Booking
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By confirming, you agree to our cancellation policy. Free cancellation up to 24 hours before your appointment.
      </p>
    </div>
  );

  const renderVisitTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-border">
        <div className="flex items-center justify-center gap-3 mb-2">
          {provider.avatar_url ? (
            <img src={provider.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {provider.first_name?.[0]}{provider.last_name?.[0]}
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {providerDisplayName(provider as any)}
        </h3>
        <p className="text-sm text-muted-foreground">{provider.specialty}</p>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-4 text-foreground">Have you seen this provider before?</h4>
        <RadioGroup value={visitType} onValueChange={(v) => setVisitType(v as 'new' | 'returning')}>
          <div 
            className={cn(
              "flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              visitType === 'new' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onClick={() => setVisitType('new')}
          >
            <RadioGroupItem value="new" id="visit-new" />
            <Label htmlFor="visit-new" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">I'm a New Patient</p>
                  <p className="text-xs text-muted-foreground">First visit — 45 min appointment</p>
                </div>
              </div>
            </Label>
          </div>

          <div 
            className={cn(
              "flex items-center space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all mt-3",
              visitType === 'returning' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onClick={() => setVisitType('returning')}
          >
            <RadioGroupItem value="returning" id="visit-returning" />
            <Label htmlFor="visit-returning" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">I'm a Returning Patient</p>
                  <p className="text-xs text-muted-foreground">Follow-up visit — 30 min appointment</p>
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button className="w-full" size="lg" onClick={() => setStep('type')}>
        Continue
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>

      <button
        onClick={() => setShowWaitlist(true)}
        className="w-full text-center text-sm text-primary hover:underline flex items-center justify-center gap-1"
      >
        <Bell className="h-3 w-3" />
        No available times? Join the waitlist
      </button>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Book Appointment
            </DialogTitle>
            <DialogDescription>
              {step === 'visit' && 'Tell us about your visit'}
              {step === 'type' && 'Choose your preferred consultation type'}
              {step === 'datetime' && 'Select a convenient date and time'}
              {step === 'confirm' && 'Review and confirm your appointment'}
            </DialogDescription>
          </DialogHeader>

          {step === 'visit' && renderVisitTypeSelection()}
          {step === 'type' && renderTypeSelection()}
          {step === 'datetime' && renderDateTimeSelection()}
          {step === 'confirm' && renderConfirmation()}
        </DialogContent>
      </Dialog>

      <WaitlistSignup provider={provider} isOpen={showWaitlist} onClose={() => setShowWaitlist(false)} />
    </>
  );
};
