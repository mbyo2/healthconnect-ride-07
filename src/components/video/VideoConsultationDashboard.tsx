
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoConsultationBooking } from './VideoConsultationBooking';
import { VideoConsultation } from './VideoConsultation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, Clock, User, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export const VideoConsultationDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');

  const { data: consultations, isLoading, refetch } = useQuery({
    queryKey: ['video-consultations-dashboard'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('video_consultations')
        .select(`
          *,
          provider:profiles!video_consultations_provider_id_fkey(
            first_name,
            last_name,
            specialty
          )
        `)
        .eq('patient_id', user.id)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const upcomingConsultations = consultations?.filter(c => 
    new Date(c.scheduled_start) > new Date() && c.status !== 'cancelled'
  ) || [];

  const pastConsultations = consultations?.filter(c => 
    new Date(c.scheduled_start) < new Date() || c.status === 'completed'
  ) || [];

  const handleBookingComplete = (consultationId: string) => {
    refetch();
    setActiveTab('upcoming');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access video consultations.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Consultations</h1>
        <p className="text-muted-foreground">Manage your video appointments and consultations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active Session</TabsTrigger>
          <TabsTrigger value="book">Book New</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Upcoming Consultations</h2>
            <Button onClick={() => setActiveTab('book')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Book New
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">Loading consultations...</div>
          ) : upcomingConsultations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No upcoming consultations</p>
                <Button onClick={() => setActiveTab('book')}>
                  Schedule Your First Consultation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingConsultations.map((consultation) => (
                <Card key={consultation.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            Dr. {consultation.provider?.first_name} {consultation.provider?.last_name}
                          </span>
                          <Badge variant="outline">{consultation.provider?.specialty}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(consultation.scheduled_start), 'PPP')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {format(new Date(consultation.scheduled_start), 'p')} - 
                          {format(new Date(consultation.scheduled_end), 'p')}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(consultation.status)}>
                          {consultation.status}
                        </Badge>
                        {consultation.status === 'scheduled' && (
                          <Button size="sm" className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            Join Call
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          <VideoConsultation />
        </TabsContent>

        <TabsContent value="book">
          <VideoConsultationBooking onBookingComplete={handleBookingComplete} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-xl font-semibold">Consultation History</h2>
          
          {pastConsultations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No consultation history</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastConsultations.map((consultation) => (
                <Card key={consultation.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            Dr. {consultation.provider?.first_name} {consultation.provider?.last_name}
                          </span>
                          <Badge variant="outline">{consultation.provider?.specialty}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(consultation.scheduled_start), 'PPP')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Duration: {consultation.duration} minutes
                        </div>
                      </div>
                      <Badge className={getStatusColor(consultation.status)}>
                        {consultation.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
