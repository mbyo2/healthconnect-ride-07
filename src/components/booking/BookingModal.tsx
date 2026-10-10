import { useState, useEffect, useRef } from "react";
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
import { expandHoursToSlots } from "@/utils/availability";
import { isExpiringSoon } from "@/utils/celebration";
import { WaitlistSignup } from "./WaitlistSignup";
import { CostBreakdown } from "./CostBreakdown";
import { DayStripPicker } from "./DayStripPicker";
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
  /** Preselect a slot (e.g. tapped from "Nearest available slots"). Jumps to the time step. */
  initialDate?: Date | null;
  initialTime?: string | null;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00"
];

export const BookingModal = ({ provider, isOpen, onClose, onRequestOpen, initialDate, initialTime }: BookingModalProps) => {
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
  // Set when the pre-login resume path restores a booking and reopens the
  // modal — the open effect must not wipe those restored selections.
  const resumedRef = useRef(false);

  // Fetch booked slots for this provider
  useEffect(() => {
    if (!isOpen || !provider?.id) return;
    
    const fetchBookedSlots = async () => {
      // Scope to the bookable window (today → +120 days). Without a date
      // bound this pulled the provider's ENTIRE appointment history just to
      // render availability for the current week.
      // Occupancy comes from the SECURITY DEFINER rpc: a direct appointments
      // SELECT is RLS-blind to other patients' bookings (own rows only),
      // which made taken slots render as free.
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const horizonStr = format(addDays(new Date(), 120), 'yyyy-MM-dd');
      const { data } = await (supabase as any).rpc('get_provider_booked_slots', {
        p_provider_ids: [provider.id],
        p_from: todayStr,
        p_to: horizonStr,
      });

      if (data) {
        // Postgres TIME comes back as "HH:MM:SS" — normalize to "HH:MM" so
        // already-booked slots actually render as booked.
        setBookedSlots(data.map((a: any) => `${a.slot_date}-${String(a.slot_time).slice(0, 5)}`));
      }
    };
    
    fetchBookedSlots();
  }, [isOpen, provider?.id]);

  const isSlotBooked = (date: Date, time: string) => {
    return bookedSlots.includes(`${format(date, 'yyyy-MM-dd')}-${time}`);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());
  const maxBookableDay = startOfDay(addDays(new Date(), 120));

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => {
    const next = addDays(weekStart, 7);
    if (isAfter(startOfDay(next), maxBookableDay)) return;
    setWeekStart(next);
  };
  const canGoNextWeek = !isAfter(startOfDay(addDays(weekStart, 7)), maxBookableDay);

  // Today's slots that already started are not bookable.
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const isSlotPast = (date: Date, time: string) => {
    if (!isSameDay(date, new Date())) return false;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m <= nowMinutes;
  };

  const STEPS = [
    { id: "visit", label: "Visit" },
    { id: "type", label: "Type" },
    { id: "datetime", label: "Time" },
    { id: "confirm", label: "Confirm" },
  ] as const;
  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // A changed selection invalidates the previous failure.
  useEffect(() => {
    setSubmitError(null);
  }, [selectedDate, selectedTime]);

  // Preselected slot (e.g. from "Nearest available slots" chips): apply it
  // when the modal opens and jump straight to the time step. A plain open
  // ("Book Appointment") starts fresh so a previously tapped chip never
  // leaks into an unrelated booking — except when the pre-login resume
  // path just restored the user's own selections (see resumedRef).
  useEffect(() => {
    if (!isOpen) return;
    if (resumedRef.current) {
      resumedRef.current = false;
      return;
    }
    if (initialDate) {
      setSelectedDate(initialDate);
      setWeekStart(startOfWeek(initialDate, { weekStartsOn: 1 }));
      if (initialTime) setSelectedTime(initialTime);
      setStep('datetime');
    } else {
      setSelectedDate(null);
      setSelectedTime(null);
      setReason("");
      setSubmitError(null);
      setStep('visit');
      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      resumedRef.current = true; // open effect must keep these selections
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
      // Capture the provider's configured consultation fee at booking time.
      // Providers set consultation_fee_min/max on their profile; the booking
      // persists the agreed fee so payments and earnings validate against it.
      // Per CEO pricing model: the fee is the provider's listed price exactly —
      // no new-visit markup. Virtual visits get a 0.7x telehealth adjustment.
      const baseFee =
        provider.consultation_fee_min ??
        provider.consultation_fee_max ??
        provider.consultation_fee ??
        null;
      const consultationFee = baseFee !== null
        ? Math.round(baseFee * (appointmentType === "virtual" ? 0.7 : 1))
        : null;

      const { data: booked, error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        provider_id: provider.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: appointmentType === 'virtual' ? 'video_consultation' : 'in_person',
        status: 'pending',
        notes: reason || null,
        duration: visitType === 'new' ? 45 : 30,
        patient_visit_type: visitType,
        consultation_fee: consultationFee
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
      // Duolingo-style celebration: confetti + haptic on booking win
      const { celebrate } = await import("@/utils/celebration");
      celebrate({ intensity: "large" });
      // App-native icon feedback (not browser-like toast)
      try {
        const { useAppFeedback } = await import("@/components/feedback/AppFeedback");
        // Note: useAppFeedback is a hook; in non-component context we dispatch a custom event
        window.dispatchEvent(new CustomEvent("app-feedback", {
          detail: { type: "success", title: "Appointment booked!", description: "Check your appointments for details." }
        }));
      } catch { /* fallback to toast already shown */ }
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
              From anywhere
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

  const renderDateTimeSelection = () => {
    // The time grid honors the provider's working hours for the selected
    // day: a Tuesday 09:00-12:00 schedule shows 09:00-11:30, not the full
    // static grid. Providers with no schedule info keep the previous static
    // grid (booking stays possible for the 8 directory providers whose
    // hours were never entered).
    const sched = (provider as any).availability_schedule as Record<
      string, { available: boolean; hours: string[] }
    > | null | undefined;
    const hasAnySchedule = !!sched && Object.keys(sched).length > 0;
    const dayKey = selectedDate ? format(selectedDate, "eeee").toLowerCase() : null;
    const dayHours: string[] = hasAnySchedule && dayKey ? (sched![dayKey]?.hours ?? []) : [];
    const baseSlots = hasAnySchedule ? expandHoursToSlots(dayHours) : TIME_SLOTS;
    // A tapped "nearest slot" chip can carry a time outside the standard
    // grid (e.g. a provider schedule of 08:35 or 17:10). Merge it in so the
    // preselected time always renders visibly selected — otherwise the user
    // lands here with nothing highlighted and Continue disabled.
    const displaySlots =
      selectedTime && !baseSlots.includes(selectedTime)
        ? [...baseSlots, selectedTime].sort()
        : baseSlots;
    const noHoursToday = !!selectedDate && hasAnySchedule && displaySlots.length === 0;
    return (
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
          {/* Week pager is desktop-only; phones get the swipeable day strip below */}
          <div className="hidden sm:flex items-center gap-2">
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
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={handleNextWeek} disabled={!canGoNextWeek} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile day strip (phones): large swipeable day cells */}
        <div className="sm:hidden">
          <DayStripPicker
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            schedule={(provider as any).availability_schedule ?? null}
          />
        </div>

        {/* Desktop week grid */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isPast = isBefore(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            
            return (
              <button
                key={day.toISOString()}
                disabled={isPast}
                aria-pressed={!!isSelected}
                aria-label={`${format(day, 'EEEE, MMM d')}${isToday ? ", today" : ""}${isPast ? ", past" : ""}`}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "p-2 rounded-xl text-center transition-all min-h-[56px] flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
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
          {noHoursToday ? (
            <p className="text-sm text-muted-foreground bg-muted rounded-xl px-4 py-6 text-center">
              {providerDisplayName(provider)} doesn't see patients on {format(selectedDate, 'EEEE')}s.
              Please choose another day.
            </p>
          ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Available times">
            {displaySlots.map((time) => {
              const isBooked = isSlotBooked(selectedDate, time);
              const isPast = isSlotPast(selectedDate, time);
              const unavailable = isBooked || isPast;
              const isSelected = selectedTime === time;
              // Uber-style urgency: slots starting within 2h pulse with an "Expiring soon" badge
              const isExpiring = !unavailable && !isSelected && isExpiringSoon(time, selectedDate);

              return (
                <button
                  key={time}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${time}${isBooked ? ", already booked" : isPast ? ", time has passed" : isExpiring ? ", available, expiring soon" : ", available"}`}
                  disabled={unavailable}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "relative p-3 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    unavailable && "bg-muted text-muted-foreground line-through cursor-not-allowed",
                    isSelected && "bg-primary text-primary-foreground",
                    isExpiring && "doc-pulse-ring bg-orange-50 border border-orange-300 text-orange-900 hover:bg-orange-100 cursor-pointer",
                    !unavailable && !isSelected && !isExpiring && "bg-muted hover:bg-primary/10 cursor-pointer"
                  )}
                >
                  {time}
                  {isExpiring && (
                    <span className="absolute -top-2 -right-1 text-[9px] font-bold text-white bg-orange-500 px-1.5 py-px rounded-full doc-urgency-blink whitespace-nowrap">
                      Expiring soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}
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
  };

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

      <Button
        variant="link"
        onClick={() => setShowWaitlist(true)}
        className="w-full text-sm"
      >
        <Bell className="h-3 w-3" />
        No available times? Join the waitlist
      </Button>
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
            {/* Step progress */}
            <ol className="flex items-center gap-1.5 pt-3" aria-label="Booking progress">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex flex-1 items-center gap-1.5 last:flex-none">
                  <span
                    aria-current={i === stepIndex ? "step" : undefined}
                    className={cn(
                      "flex h-6 flex-1 items-center justify-center rounded-full text-[10px] font-black sm:text-[11px]",
                      i < stepIndex && "bg-primary/15 text-primary",
                      i === stepIndex && "bg-primary text-primary-foreground",
                      i > stepIndex && "bg-muted text-muted-foreground"
                    )}
                  >
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className={cn("h-px w-2 sm:w-4", i < stepIndex ? "bg-primary" : "bg-border")} aria-hidden />
                  )}
                </li>
              ))}
            </ol>
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
