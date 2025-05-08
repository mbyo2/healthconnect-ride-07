
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, User, Video } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useOfflineMode } from '@/hooks/use-offline-mode';

const AppointmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { isOnline, getOfflineCache, cacheForOffline } = useOfflineMode();

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      try {
        if (!isOnline) {
          const cachedData = await getOfflineCache(`appointment-${id}`);
          if (cachedData) {
            setAppointment(cachedData);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            provider:provider_id(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        setAppointment(data);
        
        // Cache for offline use
        if (data) {
          await cacheForOffline(`appointment-${id}`, data);
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error);
        toast.error('Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [id, isOnline]);

  const joinVideoCall = () => {
    if (appointment?.video_room_url) {
      navigate(`/video/${appointment.video_room_url}`);
    } else {
      toast.error('Video room not available');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-3/4 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center p-6">
          <CardTitle className="text-xl mb-2">Appointment Not Found</CardTitle>
          <CardDescription>The appointment you're looking for doesn't exist or you don't have permission to view it.</CardDescription>
          <Button onClick={() => navigate('/appointments')} className="mt-4">
            Back to Appointments
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Appointment Details</h1>
          <Badge className={
            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }>
            {appointment.status ? appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1) : 'Unknown'}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{appointment.appointment_type || 'Consultation'}</CardTitle>
            <CardDescription>
              Appointment ID: {appointment.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span>
                {appointment.appointment_date ? format(new Date(appointment.appointment_date), 'PPP') : 'Not scheduled'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>
                {appointment.start_time ? format(new Date(`2000-01-01T${appointment.start_time}`), 'h:mm a') : 'Not scheduled'} - 
                {appointment.end_time ? format(new Date(`2000-01-01T${appointment.end_time}`), 'h:mm a') : ''}
              </span>
            </div>
            
            {appointment.provider && (
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>Dr. {appointment.provider.first_name} {appointment.provider.last_name}</span>
              </div>
            )}
            
            {appointment.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{appointment.location}</span>
              </div>
            )}
            
            {appointment.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-1">Notes</h3>
                <p className="text-muted-foreground">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            {appointment.appointment_type === 'video' && appointment.status === 'scheduled' && (
              <Button onClick={joinVideoCall} className="w-full sm:w-auto" disabled={!isOnline}>
                <Video className="mr-2 h-4 w-4" />
                Join Video Call
              </Button>
            )}
            
            <Button variant="outline" onClick={() => navigate('/appointments')} className="w-full sm:w-auto">
              Back to Appointments
            </Button>
          </CardFooter>
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default AppointmentDetails;
