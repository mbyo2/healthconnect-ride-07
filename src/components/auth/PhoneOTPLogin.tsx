import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';

interface PhoneOTPLoginProps {
  onBack?: () => void;
}

export const PhoneOTPLogin = ({ onBack }: PhoneOTPLoginProps) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [loading, setLoading] = useState(false);

  const formatPhone = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    // Zambia: if starts with 09x or 07x, prepend +260
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '260' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error('Enter your phone number'); return; }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      toast.success('OTP sent to ' + formatted);
      setStep('verify');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const { error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      toast.success('Phone verified! Welcome.');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to email
        </Button>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="text-center space-y-1">
            <Phone className="h-10 w-10 mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Sign in with Phone</h3>
            <p className="text-sm text-muted-foreground">Enter your phone number to receive a verification code</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="tel"
              placeholder="0971234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Zambian numbers: 09xx or 07xx format accepted</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Sending...' : 'Send OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">Enter Verification Code</h3>
            <p className="text-sm text-muted-foreground">Sent to {formatPhone(phone)}</p>
          </div>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('phone'); setOtp(''); }}>
            Change phone number
          </Button>
        </form>
      )}
    </div>
  );
};
