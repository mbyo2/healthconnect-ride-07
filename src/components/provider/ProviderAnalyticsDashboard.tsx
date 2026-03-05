import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Star, TrendingUp, Clock, XCircle, CheckCircle, BarChart3 } from 'lucide-react';

export const ProviderAnalyticsDashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['my-provider-stats'],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('provider_statistics' as any)
        .select('*')
        .eq('provider_id', user.id)
        .single();
      return data as any;
    },
    enabled: !!user
  });

  const { data: recentAppointments = [] } = useQuery({
    queryKey: ['provider-recent-appointments'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('appointments')
        .select(`*, patient:profiles!appointments_patient_id_fkey (first_name, last_name)`)
        .eq('provider_id', user.id)
        .order('date', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: ['provider-recent-reviews'],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('provider_reviews' as any)
        .select(`*, patient:profiles!provider_reviews_patient_id_fkey (first_name, last_name)`)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user
  });

  const completionRate = stats?.total_appointments > 0
    ? ((stats.completed_appointments / stats.total_appointments) * 100).toFixed(1)
    : '0';

  const noShowRate = stats?.total_appointments > 0
    ? ((stats.no_show_count / stats.total_appointments) * 100).toFixed(1)
    : '0';

  const statCards = [
    { label: 'Total Appointments', value: stats?.total_appointments || 0, icon: Calendar, color: 'text-blue-500' },
    { label: 'Completed', value: stats?.completed_appointments || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Cancelled', value: stats?.cancelled_appointments || 0, icon: XCircle, color: 'text-red-500' },
    { label: 'Total Patients', value: stats?.total_patients || 0, icon: Users, color: 'text-purple-500' },
    { label: 'Avg Rating', value: stats?.average_rating?.toFixed(1) || '—', icon: Star, color: 'text-amber-500' },
    { label: 'Total Reviews', value: stats?.total_reviews || 0, icon: BarChart3, color: 'text-indigo-500' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'No-Show Rate', value: `${noShowRate}%`, icon: Clock, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Practice Analytics</h2>
        <p className="text-muted-foreground">Track your performance and patient engagement</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${color}`} />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent appointments</p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                    </div>
                    <Badge variant={apt.status === 'completed' ? 'default' : apt.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {(recentReviews as any[]).map((review) => (
                  <div key={review.id} className="p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.patient?.first_name}</span>
                    </div>
                    {review.review_text && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{review.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
