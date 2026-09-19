
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { TIME_SLOTS, CONSULTATION_TYPES } from '@/config/videoConsultations';
import { CalendarIcon, Clock, Video, User, DollarSign, Wallet, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CONSULTABLE_PROVIDER_ROLES } from '@/config/roleConfig';
import { useDPOPayment } from '@/hooks/useDPOPayment';
import { useWalletPayment } from '@/hooks/useWalletPayment';
import { useCurrency } from '@/hooks/use-currency';

interface VideoConsultationBookingProps {
  onBookingComplete?: (consultationId: string) => void;
}

export const VideoConsultationBooking = ({ onBookingComplete }: VideoConsultationBookingProps) => {
  const { user } = useAuth();
  const { redirectToCheckout, loading: paymentLoading } = useDPOPayment();
  const { formatPrice, convertForCharge } = useCurrency();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { balance: walletBalance, paying: walletPaying, pay: payWithWallet } = useWalletPayment();
  const [payMethod, setPayMethod] = useState<'dpo' | 'wallet'>('dpo');

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedProvider('');
    setConsultationType('');
    setNotes('');
  };

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery({
    queryKey: ['video-consultation-providers'],
    queryFn: async () => {
      if (!user) return [];

      // Every consultable cadre (doctors, clinical officers, nurses,
      // midwives, dentists, therapists…) — verified and still practising.
      // neq(false) instead of eq(true) so legacy rows with NULL are kept.
      const base = supabase
        .from('profiles')
        .select('id, first_name, last_name, specialty, telemedicine_available')
        .in('role', CONSULTABLE_PROVIDER_ROLES as any)
        .eq('is_verified', true)
        .neq('accepting_patients', false)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(100);

      const { data, error } = await base;
      if (error) {
        console.error('Error fetching providers for video consultation:', error);
        throw error;
      }

      // Prefer clinicians who explicitly offer telemedicine, keep the rest
      // as fallback so the list is never misleadingly empty.
      const rows = data || [];
      const withTele = rows.filter((p: any) => p.telemedicine_available);
      return withTele.length > 0 ? withTele : rows;
    },
    enabled: !!user,
  });

  const timeSlots = TIME_SLOTS;

  // Prices come from the server-side price list; config only provides labels/durations.
  const { data: pricing = [] } = useQuery({
    queryKey: ['video-consultation-pricing'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('service_pricing')
        .select('service_code, base_price')
        .eq('category', 'video_consultation')
        .eq('is_active', true)
        .is('institution_id', null);
      if (error) throw error;
      return data || [];
    },
  });

  const consultationTypes = CONSULTATION_TYPES.map((type) => {
    const serviceCode = `video_consultation_${type.id}`;
    const row = (pricing as any[]).find((p) => p.service_code === serviceCode);
    return { ...type, serviceCode, price: row ? Number(row.base_price) : type.price };
  });


  const handleBookConsultation = async () => {
    if (!user || !selectedDate || !selectedTime || !selectedProvider || !consultationType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const consultationData = consultationTypes.find(type => type.id === consultationType);
      const provider = providers.find((p: any) => p.id === selectedProvider);

      if (!consultationData || !provider) {
        throw new Error('Invalid consultation type or provider');
      }

      if (payMethod === 'wallet' && walletBalance < consultationData.price) {
        toast.error('Insufficient wallet balance — top up or choose DPO.');
        setIsLoading(false);
        return;
      }

      // Calculate end time
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + consultationData.duration);

      // Create video consultation record (columns match the
      // video_consultations table: no title/duration columns exist —
      // that detail travels in notes + service_code).
      const visitSummary =
        `${consultationData.name} (${consultationData.duration} min) with ` +
        `${provider.first_name || ''} ${provider.last_name || ''}`.trim();
      const { data, error } = await supabase
        .from('video_consultations')
        .insert({
          patient_id: user.id,
          provider_id: selectedProvider,
          scheduled_start: startDateTime.toISOString(),
          scheduled_end: endDateTime.toISOString(),
          status: 'scheduled',
          notes: [visitSummary, notes?.trim()].filter(Boolean).join(' — ') || null,
          service_code: (consultationData as any).serviceCode,
        })
        .select()
        .single();

      if (error) throw error;

      if (onBookingComplete && data) {
        onBookingComplete(data.id);
      }

      if (payMethod === 'wallet') {
        // Instant settlement from the ZMW-denominated wallet — no redirect.
        const ok = await payWithWallet({
          amount: consultationData.price,
          currency: 'ZMW',
          providerId: selectedProvider,
          serviceId: (consultationData as any).serviceCode,
          description: `${consultationData.name} - Dr. ${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
        });
        if (ok) {
          toast.success('Consultation booked and paid from wallet.');
          resetForm();
        }
        return;
      }

      toast.success('Consultation reserved — redirecting to secure payment…');

      // Amount + currency must always travel as a converted pair so the
      // gateway charges exactly what was displayed (ZMW-canonical price).
      const charge = convertForCharge(consultationData.price);
      // Kick off DPO Pay hosted checkout for the consultation fee
      await redirectToCheckout({
        amount: charge.amount,
        currency: charge.currency,
        reference_type: 'consultation',
        reference_id: data?.id,
        description: `${consultationData.name} - Dr. ${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
        customer_first_name: (user as any)?.user_metadata?.first_name,
        customer_last_name: (user as any)?.user_metadata?.last_name,
      });
    } catch (error) {
      console.error('Error booking consultation:', error);
      toast.error('Failed to book consultation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedConsultationType = consultationTypes.find(type => type.id === consultationType);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-6 w-6" />
          Book Video Consultation
        </CardTitle>
        <CardDescription>
          Schedule a secure video appointment with your healthcare provider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date < new Date('1900-01-01')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Select Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Healthcare Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingProviders ? 'Loading providers...' : 'Select a provider'} />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider: any) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {provider.first_name} {provider.last_name}
                    {provider.specialty ? ` - ${provider.specialty}` : ''}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Consultation Type</Label>
          <Select value={consultationType} onValueChange={setConsultationType}>
            <SelectTrigger>
              <SelectValue placeholder="Select consultation type" />
            </SelectTrigger>
            <SelectContent>
              {consultationTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex justify-between items-center w-full">
                    <span>{type.name}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {type.price}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {type.duration}min
                      </Badge>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any specific concerns or information for your healthcare provider..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {selectedConsultationType && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Consultation Summary</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Type:</strong> {selectedConsultationType.name}</p>
              <p><strong>Duration:</strong> {selectedConsultationType.duration} minutes</p>
              <p><strong>Cost:</strong> {formatPrice(selectedConsultationType.price)}</p>
              {selectedDate && selectedTime && (
                <p><strong>Date & Time:</strong> {format(selectedDate, 'PPP')} at {selectedTime}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMethod('dpo')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${payMethod === 'dpo' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-canvas-silk text-graphite-500'}`}
            >
              <CreditCard className="h-4 w-4" /> Card / MoMo (DPO)
            </button>
            <button
              type="button"
              onClick={() => setPayMethod('wallet')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${payMethod === 'wallet' ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-canvas-silk text-graphite-500'}`}
            >
              <Wallet className="h-4 w-4" /> Wallet ({formatPrice(walletBalance)})
            </button>
          </div>
          {payMethod === 'wallet' && selectedConsultationType && walletBalance < selectedConsultationType.price && (
            <p className="text-xs font-medium text-error-500">
              Insufficient balance — top up your wallet or pay with DPO.
            </p>
          )}
        </div>

        <Button
          onClick={handleBookConsultation}
          disabled={!selectedDate || !selectedTime || !selectedProvider || !consultationType || isLoading || paymentLoading || walletPaying}
          className="w-full"
          size="lg"
        >
          {isLoading || paymentLoading || walletPaying
            ? 'Processing…'
            : payMethod === 'wallet'
              ? `Book & Pay from Wallet${selectedConsultationType ? ` ${formatPrice(selectedConsultationType.price)}` : ''}`
              : `Book & Pay${selectedConsultationType ? ` ${formatPrice(selectedConsultationType.price)}` : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
};
