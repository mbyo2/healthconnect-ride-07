
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
  Footprints
} from "lucide-react";
import { getHealthStats, getHealthGoals, getUpcomingAppointments, type HealthStat, type HealthGoal, type UpcomingAppointment } from "@/services/healthMetrics";
import { useNavigate } from "react-router-dom";

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
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
      case "Good":
      case "On Track":
        return "bg-green-100 text-green-800";
      case "Warning":
        return "bg-yellow-100 text-yellow-800";
      case "Alert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Health Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your health metrics and track your wellness goals
        </p>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {healthStats.length > 0 ? healthStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getIconComponent(stat.icon)}
                </div>
                {getTrendIcon(stat.trend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{stat.title}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </div>
                <Badge className={getStatusColor(stat.status)}>
                  {stat.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">No health metrics recorded yet. Start tracking your health!</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Daily Goals
            </CardTitle>
            <CardDescription>
              Track your progress towards daily health targets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {healthGoals.length > 0 ? healthGoals.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIconComponent(goal.icon)}
                    <span className="font-medium">{goal.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} className="h-2" />
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">
                No health goals set yet. Create your first goal!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>
              Your scheduled healthcare appointments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.length > 0 ? upcomingAppointments.map((appointment, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{appointment.type}</h3>
                  <p className="text-sm text-muted-foreground">{appointment.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.date} at {appointment.time}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-4">
                No upcoming appointments scheduled.
              </p>
            )}
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate('/search')}
            >
              Schedule New Appointment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common health management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/symptoms')}
            >
              <Activity className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Log Symptoms</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/health-dashboard')}
            >
              <Heart className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Record Vitals</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Book Appointment</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/health-dashboard')}
            >
              <Target className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Set New Goal</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
