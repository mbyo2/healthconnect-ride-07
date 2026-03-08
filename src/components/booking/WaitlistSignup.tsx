import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Clock, Calendar, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { Provider } from '@/types/provider';

interface WaitlistSignupProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
}

const PREFERRED_TIMES = [
  { id: 'morning', label: 'Morning (8-12)' },
  { id: 'afternoon', label: 'Afternoon (12-4)' },
  { id: 'evening', label: 'Evening (4-6)' },
  { id: 'any', label: 'Any time' },
];

export const WaitlistSignup = ({ provider, isOpen, onClose }: WaitlistSignupProps) => {
  const { user } = useAuth();
  const [urgency, setUrgency] = useState<string>('normal');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['any']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleTime = (time: string) => {
    if (time === 'any') {
      setSelectedTimes(['any']);
      return;
    }
    setSelectedTimes(prev => {
      const filtered = prev.filter(t => t !== 'any');
      return filtered.includes(time) ? filtered.filter(t => t !== time) : [...filtered, time];
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to join the waitlist');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('appointment_waitlist').insert({
        patient_id: user.id,
        provider_id: provider.id,
        preferred_dates: selectedDays.length > 0 ? selectedDays : null,
        preferred_times: selectedTimes,
        urgency,
        notes: notes || null,
        appointment_type: 'in_person',
      });
      if (error) throw error;
      toast.success("You've been added to the waitlist! We'll notify you when a slot opens.");
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to join waitlist');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Join Waitlist
          </DialogTitle>
          <DialogDescription>
            Get notified when an earlier appointment opens with Dr. {provider.first_name} {provider.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Urgency */}
          <div>
            <Label className="text-sm font-medium mb-3 block">How soon do you need to be seen?</Label>
            <RadioGroup value={urgency} onValueChange={setUrgency} className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">Flexible</p>
                  <p className="text-xs text-muted-foreground">Anytime in the next 30 days</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="soon" id="soon" />
                <Label htmlFor="soon" className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">Soon</p>
                  <p className="text-xs text-muted-foreground">Within the next week</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-amber-500/30 hover:bg-amber-500/5 cursor-pointer">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">Urgent</p>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">First available slot</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Preferred Days */}
          <div>
            <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Preferred Days (optional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {nextDays.slice(0, 10).map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isSelected = selectedDays.includes(dayStr);
                return (
                  <button
                    key={dayStr}
                    onClick={() => toggleDay(dayStr)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-primary/10'
                    }`}
                  >
                    {format(day, 'EEE d')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Times */}
          <div>
            <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Preferred Times
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PREFERRED_TIMES.map(time => (
                <button
                  key={time.id}
                  onClick={() => toggleTime(time.id)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedTimes.includes(time.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-primary/10'
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any details about your visit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Joining...</>
            ) : (
              <><Bell className="h-4 w-4 mr-2" />Join Waitlist</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You'll receive a notification when a matching slot becomes available. Your spot expires after 30 days.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
