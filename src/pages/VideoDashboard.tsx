import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Calendar, Users, Phone } from 'lucide-react';
import { safeCryptoUUID } from '@/utils/storage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const VideoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ upcoming: 0, today: 0, active: 0, loading: true });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().split('T')[0];
        const sevenDays = new Date(now.getTime() + 7 * 86_400_000).toISOString().split('T')[0];

        const isPatient = true;
        const filterCol = isPatient ? 'patient_id' : 'provider_id';

        const [upcomingRes, todayRes, activeRes] = await Promise.all([
          (supabase as any).from('video_consultations')
            .select('id', { count: 'exact', head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .gte('scheduled_at', now.toISOString())
            .lte('scheduled_at', `${sevenDays}T23:59:59`),
          (supabase as any).from('video_consultations')
            .select('id', { count: 'exact', head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .gte('scheduled_at', `${today}T00:00:00`)
            .lt('scheduled_at', `${tomorrow}T00:00:00`),
          (supabase as any).from('video_consultations')
            .select('id', { count: 'exact', head: true })
            .or(`patient_id.eq.${user.id},provider_id.eq.${user.id}`)
            .in('status', ['in_progress', 'live']),
        ]);

        setStats({
          upcoming: upcomingRes.count ?? 0,
          today: todayRes.count ?? 0,
          active: activeRes.count ?? 0,
          loading: false,
        });
      } catch (err) {
        console.error('VideoDashboard load error:', err);
        setStats((s) => ({ ...s, loading: false }));
      }
    })();
  }, [user]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Video Dashboard</h1>
        <p className="text-muted-foreground">Manage your video consultations and appointments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />Upcoming Sessions</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.loading ? '—' : stats.upcoming}</p>
            <p className="text-sm text-muted-foreground">{stats.upcoming === 0 ? 'No sessions scheduled' : `${stats.upcoming} scheduled`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Today's Schedule</CardTitle>
            <CardDescription>Video calls for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.loading ? '—' : stats.today}</p>
            <p className="text-sm text-muted-foreground">{stats.today === 0 ? 'Free day' : `${stats.today} today`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Active Now</CardTitle>
            <CardDescription>Live consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.loading ? '—' : stats.active}</p>
            <p className="text-sm text-muted-foreground">{stats.active === 0 ? 'No active consultations' : `${stats.active} live`}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Start a video session or schedule an appointment</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button className="flex items-center gap-2" onClick={() => window.location.href = `/video-call/${safeCryptoUUID()}`}>
            <Phone className="h-4 w-4" />Start Video Call
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => window.location.href = '/appointments'}>
            <Calendar className="h-4 w-4" />Schedule Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoDashboard;
