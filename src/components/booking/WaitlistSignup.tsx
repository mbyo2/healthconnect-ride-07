import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, Clock, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { Provider } from '@/types/provider';
import { providerDisplayName } from '@/utils/providerDisplay';
import {
  savePendingAction,
  takePendingAction,
  peekPendingAction,
  authRedirectUrl,
  currentReturnTo,
} from '@/utils/pendingAction';

interface WaitlistSignupProps {
  provider: Provider;
  isOpen: boolean;
  onClose: () => void;
  /** Called when a saved pre-login waitlist entry is ready to resume. */
  onRequestOpen?: () => void;
}

const PREFERRED_TIMES = [
  { id: 'morning', label: 'Morning (8-12)' },
  { id: 'afternoon', label: 'Afternoon (12-4)' },
  { id: 'evening', label: 'Evening (4-6)' },
  { id: 'any', label: 'Any time' },
];

export const WaitlistSignup = ({ provider, isOpen, onClose, onRequestOpen }: WaitlistSignupProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [urgency, setUrgency] = useState<string>('normal');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['any']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Resume a waitlist entry started before login — nothing is submitted
  // until the user confirms.
  useEffect(() => {
    if (isOpen || !user || !provider?.id || !onRequestOpen) return;
    const pending = peekPendingAction();
    if (pending?.kind === 'waitlist' && pending.providerId === provider.id) {
      takePendingAction();
      setUrgency(pending.urgency);
      setSelectedDays(pending.selectedDays);
      setSelectedTimes(pending.selectedTimes);
      setNotes(pending.notes || '');
      onRequestOpen();
      toast.success('Welcome back — your waitlist preferences were kept. Review and join.');
    }
  }, [isOpen, user, provider?.id, onRequestOpen]);

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
      // Auth wall: stash preferences so login resumes the join flow.
      savePendingAction({
        kind: 'waitlist',
        providerId: provider.id,
        urgency,
        selectedDays,
        selectedTimes,
        notes,
        returnTo: currentReturnTo(),
        createdAt: Date.now(),
      });
      toast.info('Sign in to join the waitlist — your preferences are saved.');
      navigate(authRedirectUrl(currentReturnTo()));
      return;
    }
    setSubmitting(true);
    try {
      // appointment_waitlist has preferred_date_start/end and
      // preferred_time_start/end — the old preferred_dates/preferred_times/
      // appointment_type keys do not exist and every join was rejected.
      const sortedDays = [...selectedDays].sort();
      const sortedTimes = [...selectedTimes].sort();
      const { error } = await (supabase as any).from('appointment_waitlist').insert({
        patient_id: user.id,
        provider_id: provider.id,
        preferred_date_start: sortedDays[0] ?? null,
        preferred_date_end: sortedDays[sortedDays.length - 1] ?? null,
        preferred_time_start: sortedTimes[0] ?? null,
        preferred_time_end: sortedTimes[sortedTimes.length - 1] ?? null,
        urgency,
        notes: notes || null,
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
            Get notified when an earlier appointment opens with {providerDisplayName(provider as any)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">How soon do you need to be seen?</Label>
            <RadioGroup value={urgency} onValueChange={setUrgency} className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="normal" id="wl-normal" />
                <Label htmlFor="wl-normal" className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">Flexible</p>
                  <p className="text-xs text-muted-foreground">Anytime in the next 30 days</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="soon" id="wl-soon" />
                <Label htmlFor="wl-soon" className="flex-1 cursor-pointer">
                  <p className="font-medium text-sm">Soon</p>
                  <p className="text-xs text-muted-foreground">Within the next week</p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="urgent" id="wl-urgent" />
                <Label htmlFor="wl-urgent" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">Urgent</p>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">First available slot</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

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
                    aria-pressed={isSelected}
                    onClick={() => toggleDay(dayStr)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/10'
                    }`}
                  >
                    {format(day, 'EEE d')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Preferred Times
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {PREFERRED_TIMES.map(time => (
                <button
                  key={time.id}
                  aria-pressed={selectedTimes.includes(time.id)}
                  onClick={() => toggleTime(time.id)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedTimes.includes(time.id) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/10'
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="wl-notes">Additional Notes (optional)</Label>
            <Textarea
              id="wl-notes"
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
