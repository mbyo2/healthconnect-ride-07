
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

export default function HealthDashboard() {
  const healthStats = [
    {
      title: "Blood Pressure",
      value: "120/80",
      unit: "mmHg",
      status: "Normal",
      trend: "stable",
      icon: <Heart className="h-5 w-5" />
    },
    {
      title: "Heart Rate",
      value: "72",
      unit: "bpm",
      status: "Good",
      trend: "up",
      icon: <Activity className="h-5 w-5" />
    },
    {
      title: "Weight",
      value: "165",
      unit: "lbs",
      status: "On Track",
      trend: "down",
      icon: <Target className="h-5 w-5" />
    },
    {
      title: "Sleep",
      value: "7.5",
      unit: "hours",
      status: "Good",
      trend: "up",
      icon: <Moon className="h-5 w-5" />
    }
  ];

  const healthGoals = [
    {
      title: "Daily Steps",
      current: 8500,
      target: 10000,
      icon: <Footprints className="h-4 w-4" />
    },
    {
      title: "Water Intake",
      current: 6,
      target: 8,
      icon: <Droplets className="h-4 w-4" />
    },
    {
      title: "Exercise Minutes",
      current: 45,
      target: 60,
      icon: <Activity className="h-4 w-4" />
    },
    {
      title: "Fruits & Vegetables",
      current: 4,
      target: 5,
      icon: <Apple className="h-4 w-4" />
    }
  ];

  const upcomingAppointments = [
    {
      date: "Dec 15, 2024",
      time: "2:00 PM",
      provider: "Dr. Sarah Johnson",
      type: "Annual Checkup"
    },
    {
      date: "Dec 22, 2024",
      time: "10:30 AM",
      provider: "Dr. Michael Chen",
      type: "Cardiology Follow-up"
    }
  ];

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
        {healthStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {stat.icon}
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
        ))}
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
            {healthGoals.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {goal.icon}
                    <span className="font-medium">{goal.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} className="h-2" />
              </div>
            ))}
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
            {upcomingAppointments.map((appointment, index) => (
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
            ))}
            <Button className="w-full" variant="outline">
              Schedule New Appointment
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common health management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <Activity className="h-4 w-4 mr-2" />
              Log Symptoms
            </Button>
            <Button variant="outline" className="justify-start">
              <Heart className="h-4 w-4 mr-2" />
              Record Vitals
            </Button>
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline" className="justify-start">
              <Target className="h-4 w-4 mr-2" />
              Set New Goal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
