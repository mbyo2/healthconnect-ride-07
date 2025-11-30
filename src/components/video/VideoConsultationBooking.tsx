
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
import { CalendarIcon, Clock, Video, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface VideoConsultationBookingProps {
  onBookingComplete?: (consultationId: string) => void;
}

export const VideoConsultationBooking = ({ onBookingComplete }: VideoConsultationBookingProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [consultationType, setConsultationType] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery({
    queryKey: ['video-consultation-providers'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, specialty')
        .eq('role', 'health_personnel');

      if (error) {
        console.error('Error fetching providers for video consultation:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user,
  });

  const timeSlots = TIME_SLOTS;

  const consultationTypes = CONSULTATION_TYPES;

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

      // Calculate end time
      const startDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + consultationData.duration);

      // Create video consultation record
      const { data, error } = await supabase
        .from('video_consultations')
        .insert({
          patient_id: user.id,
          provider_id: selectedProvider,
          title: `${consultationData.name} with ${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
          scheduled_start: startDateTime.toISOString(),
          scheduled_end: endDateTime.toISOString(),
          status: 'scheduled',
          notes: notes || null,
          duration: consultationData.duration
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Video consultation booked successfully!');
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedProvider('');
      setConsultationType('');
      setNotes('');
      
      if (onBookingComplete && data) {
        onBookingComplete(data.id);
      }
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
              <p><strong>Cost:</strong> ${selectedConsultationType.price}</p>
              {selectedDate && selectedTime && (
                <p><strong>Date & Time:</strong> {format(selectedDate, 'PPP')} at {selectedTime}</p>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={handleBookConsultation}
          disabled={!selectedDate || !selectedTime || !selectedProvider || !consultationType || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Booking...' : 'Book Consultation'}
        </Button>
      </CardContent>
    </Card>
  );
};
