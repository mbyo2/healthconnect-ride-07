
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Users, Phone } from 'lucide-react';

const VideoDashboard: React.FC = () => {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Video Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your video consultations and appointments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
            <CardDescription>Your scheduled video consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">No sessions scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Video calls for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Free day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Patients
            </CardTitle>
            <CardDescription>Patients you're consulting</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">No active consultations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Start a video session or schedule an appointment</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button className="flex items-center gap-2" onClick={() => window.location.href = `/video-call/${crypto.randomUUID()}`}>
            <Phone className="h-4 w-4" />
            Start Video Call
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => window.location.href = '/appointments'}>
            <Calendar className="h-4 w-4" />
            Schedule Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoDashboard;
