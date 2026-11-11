// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Apple,
  Droplets,
  Moon,
  Footprints,
  Bot,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { getHealthStats, getHealthGoals, getUpcomingAppointments, type HealthStat, type HealthGoal, type UpcomingAppointment } from "@/services/healthMetrics";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ReviewPromptCard } from "@/components/patient/ReviewPrompts";
import DependentManager from "@/components/patient/DependentManager";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "@/components/charts";
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Award } from "lucide-react";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";
import { PatientMetricsDashboard } from "@/components/metrics/RoleMetricsDashboard";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface VitalPoint { value: number }

export default function HealthDashboard() {
  const [healthStats, setHealthStats] = useState<HealthStat[]>([]);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [vitalHistory, setVitalHistory] = useState<{
    heartRate: VitalPoint[]; systolic: VitalPoint[]; diastolic: VitalPoint[];
    spo2: VitalPoint[]; weight: VitalPoint[];
    latest: { heartRate: number | null; systolic: number | null; diastolic: number | null; spo2: number | null; weight: number | null };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, goals, appointments] = await Promise.all([
          getHealthStats(),
          getHealthGoals(),
          getUpcomingAppointments()
        ]);
        setHealthStats(stats);
        setHealthGoals(goals);
        setUpcomingAppointments(appointments);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Vitals history for the graphic tiles — last 20 readings, real data only.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('vital_signs')
          .select('heart_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation, weight, recorded_at')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(20);
        if (error || !data || data.length === 0) return;
        const rows = [...(data as any[])].reverse();
        const series = (pick: (r: any) => number | null): VitalPoint[] =>
          rows.map((r) => ({ value: Number(pick(r)) })).filter((p) => Number.isFinite(p.value));
        const first = rows[rows.length - 1] as any;
        setVitalHistory({
          heartRate: series((r) => r.heart_rate),
          systolic: series((r) => r.blood_pressure_systolic),
          diastolic: series((r) => r.blood_pressure_diastolic),
          spo2: series((r) => r.oxygen_saturation),
          weight: series((r) => r.weight),
          latest: {
            heartRate: first?.heart_rate ?? null,
            systolic: first?.blood_pressure_systolic ?? null,
            diastolic: first?.blood_pressure_diastolic ?? null,
            spo2: first?.oxygen_saturation ?? null,
            weight: first?.weight ?? null,
          },
        });
      } catch (error) {
        console.error('Error fetching vitals history:', error);
      }
    })();
  }, [user]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "Normal":
      case "Good":
      case "On Track":
        return "positive" as const;
      case "Warning":
        return "warning" as const;
      case "Alert":
        return "negative" as const;
      default:
        return "neutral" as const;
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Heart, Activity, Target, Moon, Footprints, Droplets, Apple
    };
    const IconComponent = icons[iconName] || Activity;
    return <IconComponent className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div>
        <p className="sr-only">Loading your health dashboard…</p>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Health dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor your health metrics and track your wellness goals
            </p>
          </div>
          <Button onClick={() => navigate('/ai-diagnostics')} className="gap-2 shrink-0">
            <Bot className="h-4 w-4" />
            AI health assistant
          </Button>
        </div>

        {/* Metrics Overview — appointments, prescriptions, records, wallet */}
        <PatientMetricsDashboard />

        {/* AI Insights Widget */}
        {loadError && !loading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm font-medium text-destructive">
              We couldn&apos;t load your health data. Check your connection and try again.
            </p>
            <Button variant="outline" className="min-h-[44px] shrink-0" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}
        <AIInsightsWidget
          context="health"
          data={{
            stats: healthStats,
            goals: healthGoals
          }}
        />

        {/* Vitals strip — graphic tiles from recorded vitals history */}
        {vitalHistory && (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">Latest vitals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {vitalHistory.latest.heartRate != null && (
                <StatsCard
                  label="Heart Rate"
                  value={`${vitalHistory.latest.heartRate} bpm`}
                  icon={Heart}
                  color="#E2445C" /* theme: error-500 */
                  sparklineData={vitalHistory.heartRate}
                />
              )}
              {vitalHistory.latest.systolic != null && (
                <StatsCard
                  label="Blood Pressure"
                  value={`${vitalHistory.latest.systolic}/${vitalHistory.latest.diastolic ?? '–'} mmHg`}
                  icon={Activity}
                  color="#0066F5" /* theme: primary-500 */
                  sparklineData={vitalHistory.systolic}
                />
              )}
              {vitalHistory.latest.spo2 != null && (
                <StatsCard
                  label="Oxygen Saturation"
                  value={`${vitalHistory.latest.spo2}%`}
                  icon={Droplets}
                  color="#00A86B" /* theme: success-600 doc-green */
                  sparklineData={vitalHistory.spo2}
                />
              )}
              {vitalHistory.latest.weight != null && (
                <StatsCard
                  label="Weight"
                  value={`${vitalHistory.latest.weight} kg`}
                  icon={Target}
                  color="#F59E0B" /* theme: warning-500 (was off-palette purple) */
                  sparklineData={vitalHistory.weight}
                />
              )}
            </div>
          </div>
        )}

        {/* Health Stats - Modern Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {healthStats.length > 0 ? healthStats.map((stat, index) => (
            <div key={index} className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-primary-500/10 text-primary-600 border border-primary-500/20">
                  {getIconComponent(stat.icon)}
                </div>
                {getTrendIcon(stat.trend)}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-base">{stat.title}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tnum">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </div>
                <StatusBadge tone={getStatusTone(stat.status)}>
                  {stat.status}
                </StatusBadge>
              </div>
            </div>
          )) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Heart className="h-8 w-8 mx-auto text-primary-500 mb-3" />
              <p className="font-medium text-foreground">No health metrics yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start tracking — add vitals, symptoms, or connect a device.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/iot-monitoring')}>Record vitals</Button>
                <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/symptoms')}>Log symptoms</Button>
              </div>
            </div>
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Goals */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Daily goals
            </CardTitle>
            <CardDescription>
              Track your progress towards daily health targets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {healthGoals.length > 0 ? healthGoals.map((goal, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getIconComponent(goal.icon)}
                    </div>
                    <span className="font-semibold text-base">{goal.title}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <Progress value={goal.target > 0 ? (goal.current / goal.target) * 100 : 0} className="h-3" />
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-base">
                  No health goals set yet. Create your first goal!
                </p>
                <Button className="mt-4 min-h-[44px]" onClick={() => navigate('/health-analytics')}>
                  Set your first goal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Prompts - post-visit feedback */}
        <ReviewPromptCard />

        {/* Family members - book appointments for dependents */}
        <DependentManager />

        {/* Upcoming appointments */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming appointments
            </CardTitle>
            <CardDescription>
              Your scheduled healthcare appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.length > 0 ? upcomingAppointments.map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">{appointment.type}</h3>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{appointment.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.date} at {appointment.time}
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate(appointment.id ? `/appointments/${appointment.id}` : '/appointments')} className="ml-4 shrink-0">
                  View details
                </Button>
              </div>
            )) : (
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="You have no upcoming appointments scheduled. Your next visits will appear here."
              />
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/search')}
            >
              Schedule new appointment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Common health management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-11"
              onClick={() => navigate('/symptoms')}
            >
              <Activity className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Log symptoms</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-11"
              onClick={() => navigate('/iot-monitoring')}
            >
              <Heart className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Record vitals</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-11"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Book appointment</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-11"
              onClick={() => navigate('/health-analytics')}
            >
              <Target className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Set new goal</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gamification / Achievements */}
      <GamificationSection />
      </div>
    </div>
  );
}

function GamificationSection() {
  const { user } = useAuth();
  const { badges, achievements, loading } = useGamification(user?.id);

  if (!user) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-border p-6 space-y-4">
            <div className="h-6 w-40 doc-shimmer rounded-md" />
            <div className="h-16 doc-shimmer rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Your badges
          </CardTitle>
          <CardDescription>Earned by tracking your health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {badges.length > 0 ? badges.map((userBadge) => (
              <div key={userBadge.id} className="flex flex-col items-center p-3 border border-border rounded-lg bg-muted/40" title={userBadge.badge.description}>
                <div className="p-3 bg-primary-500/10 rounded-full mb-2">
                  <Award className="h-5 w-5 text-primary-600" />
                </div>
                <span className="text-xs font-semibold">{userBadge.badge.name}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No badges earned yet. Keep tracking!</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
          <CardDescription>Progress towards milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievements.length > 0 ? achievements.map((achievement) => (
            <div key={achievement.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold capitalize text-base">{achievement.achievement_type.replace('_', ' ')}</span>
                <span className="text-muted-foreground font-medium">{achievement.progress}/{achievement.target}</span>
              </div>
              <Progress value={achievement.target > 0 ? (achievement.progress / achievement.target) * 100 : 0} className="h-3" />
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No active achievements.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
