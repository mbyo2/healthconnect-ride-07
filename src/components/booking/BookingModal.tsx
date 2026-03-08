import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video, Building2, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import { Provider } from "@/types/provider";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BookingModalProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
}

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00"
];

export const BookingModal = ({ provider, isOpen, onClose }: BookingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'type' | 'datetime' | 'confirm'>('type');
  const [appointmentType, setAppointmentType] = useState<'physical' | 'virtual'>('physical');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Fetch booked slots for this provider
  useEffect(() => {
    if (!isOpen || !provider?.id) return;
    
    const fetchBookedSlots = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('date, time')
        .eq('provider_id', provider.id)
        .in('status', ['scheduled', 'confirmed']);
      
      if (data) {
        setBookedSlots(data.map(a => `${a.date}-${a.time}`));
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

  const handleSubmit = async () => {
    if (!user || !selectedDate || !selectedTime) {
      toast.error("Please complete all booking details");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: user.id,
        provider_id: provider.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        type: appointmentType === 'virtual' ? 'video_consultation' : 'in_person',
        status: 'scheduled',
        notes: reason || null,
        duration: 30
      });

      if (error) throw error;

      toast.success("Appointment booked successfully!");
      onClose();
      navigate('/appointments');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTypeSelection = () => (
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
          Dr. {provider.first_name} {provider.last_name}
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
            {provider.address && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {provider.city || 'Clinic'}
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
      <Button variant="ghost" size="sm" onClick={() => setStep('type')} className="mb-2">
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
              className="h-8 w-8"
              onClick={handlePrevWeek}
              disabled={isBefore(weekStart, today)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[120px] text-center">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
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
                  "p-2 rounded-xl text-center transition-all",
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
          <div className="grid grid-cols-4 gap-2">
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
      <Button variant="ghost" size="sm" onClick={() => setStep('datetime')} className="mb-2">
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
              <p className="font-medium text-foreground">Dr. {provider.first_name} {provider.last_name}</p>
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Choose your preferred consultation type'}
            {step === 'datetime' && 'Select a convenient date and time'}
            {step === 'confirm' && 'Review and confirm your appointment'}
          </DialogDescription>
        </DialogHeader>

        {step === 'type' && renderTypeSelection()}
        {step === 'datetime' && renderDateTimeSelection()}
        {step === 'confirm' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
};
