import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useGamification } from "@/hooks/useGamification";
import { Trophy, Award } from "lucide-react";
import { AIInsightsWidget } from "@/components/ai/AIInsightsWidget";

export default function HealthDashboard() {
  const [healthStats, setHealthStats] = useState<HealthStat[]>([]);
  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
      case "Good":
      case "On Track":
        return "bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200";
      case "Warning":
        return "bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200";
      case "Alert":
        return "bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200";
      default:
        return "bg-muted text-muted-foreground";
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
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="text-center">Loading your health dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="vf-eyebrow mb-4">
              <Heart className="h-3.5 w-3.5 text-accent-500" />
              Your Health Journey
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-midnight tracking-tight mb-3">Health Dashboard</h1>
            <p className="text-base text-graphite-500 leading-relaxed tracking-wide max-w-2xl">
              Monitor your health metrics and track your wellness goals
            </p>
          </div>
          <Button onClick={() => navigate('/ai-diagnostics')} className="vf-btn-primary mt-4 md:mt-0 gap-2 h-12 px-6">
            <Bot className="h-5 w-5" />
            AI Health Assistant
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Insights Widget */}
        <AIInsightsWidget
          context="health"
          data={{
            stats: healthStats,
            goals: healthGoals
          }}
        />

        {/* Health Stats - Modern Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {healthStats.length > 0 ? healthStats.map((stat, index) => (
            <div key={index} className="vf-card space-y-3 group">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-2xl bg-primary-50 border border-primary-100">
                  {getIconComponent(stat.icon)}
                </div>
                {getTrendIcon(stat.trend)}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-base">{stat.title}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </div>
                <Badge className={getStatusColor(stat.status)} variant="secondary">
                  {stat.status}
                </Badge>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">No health metrics recorded yet. Start tracking your health!</p>
            </div>
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Goals */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="h-6 w-6 text-primary" />
              Daily Goals
            </CardTitle>
            <CardDescription className="text-base">
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
                <Progress value={(goal.current / goal.target) * 100} className="h-3" />
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-8 text-base">
                No health goals set yet. Create your first goal!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-6 w-6 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription className="text-base">
              Your scheduled healthcare appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.length > 0 ? upcomingAppointments.map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border-2 border-border/50 rounded-xl hover:border-primary/50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-semibold text-base">{appointment.type}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{appointment.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.date} at {appointment.time}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/appointments/${index}`)} className="ml-4">
                  View Details
                </Button>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-8 text-base">
                No upcoming appointments scheduled.
              </p>
            )}
            <Button
              className="w-full h-12 text-base"
              variant="outline"
              onClick={() => navigate('/search')}
            >
              Schedule New Appointment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-base">
            Common health management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-12 text-base"
              onClick={() => navigate('/symptoms')}
            >
              <Activity className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Log Symptoms</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-12 text-base"
              onClick={() => navigate('/iot-monitoring')}
            >
              <Heart className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Record Vitals</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-12 text-base"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Book Appointment</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-start gap-3 h-12 text-base"
              onClick={() => navigate('/health-analytics')}
            >
              <Target className="h-5 w-5 flex-shrink-0" />
              <span className="text-left">Set New Goal</span>
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
  const { badges, achievements } = useGamification(user?.id);

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
            Your Badges
          </CardTitle>
          <CardDescription className="text-base">Earn badges by staying healthy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {badges.length > 0 ? badges.map((userBadge) => (
              <div key={userBadge.id} className="flex flex-col items-center p-3 border-2 border-border/50 rounded-xl bg-yellow-50/50 dark:bg-yellow-950/10 hover:border-yellow-500/50 transition-colors" title={userBadge.badge.description}>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-950/20 rounded-full mb-2">
                  <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-xs font-semibold">{userBadge.badge.name}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No badges earned yet. Keep tracking!</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-xl transition-all duration-300 border-2 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-primary" />
            Achievements
          </CardTitle>
          <CardDescription className="text-base">Progress towards milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievements.length > 0 ? achievements.map((achievement) => (
            <div key={achievement.id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold capitalize text-base">{achievement.achievement_type.replace('_', ' ')}</span>
                <span className="text-muted-foreground font-medium">{achievement.progress}/{achievement.target}</span>
              </div>
              <Progress value={(achievement.progress / achievement.target) * 100} className="h-3" />
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No active achievements.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
