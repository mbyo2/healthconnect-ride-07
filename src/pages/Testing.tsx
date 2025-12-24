
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Zap,
  Shield,
  Accessibility
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Testing() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  const testSuites = [
    {
      id: "functionality",
      name: "Functionality Tests",
      description: "Core application features and user flows",
      tests: [
        { name: "User Authentication", status: "passed" },
        { name: "Appointment Booking", status: "passed" },
        { name: "Provider Search", status: "passed" },
        { name: "Payment Processing", status: "failed" },
        { name: "Video Consultation", status: "warning" },
        { name: "Message System", status: "passed" }
      ]
    },
    {
      id: "performance",
      name: "Performance Tests",
      description: "Speed, responsiveness, and resource usage",
      tests: [
        { name: "Page Load Speed", status: "passed", metric: "1.2s" },
        { name: "API Response Time", status: "passed", metric: "230ms" },
        { name: "Bundle Size", status: "warning", metric: "2.1MB" },
        { name: "Memory Usage", status: "passed", metric: "45MB" },
        { name: "Database Queries", status: "passed", metric: "12ms avg" }
      ]
    },
    {
      id: "accessibility",
      name: "Accessibility Tests",
      description: "WCAG compliance and usability for all users",
      tests: [
        { name: "Keyboard Navigation", status: "passed" },
        { name: "Screen Reader Support", status: "passed" },
        { name: "Color Contrast", status: "passed" },
        { name: "Focus Indicators", status: "passed" },
        { name: "Alt Text Coverage", status: "warning" }
      ]
    },
    {
      id: "security",
      name: "Security Tests",
      description: "Data protection and vulnerability scanning",
      tests: [
        { name: "Input Validation", status: "passed" },
        { name: "SQL Injection", status: "passed" },
        { name: "XSS Protection", status: "passed" },
        { name: "HTTPS Enforcement", status: "passed" },
        { name: "Session Management", status: "passed" }
      ]
    }
  ];

  const deviceTests = [
    { name: "Desktop Chrome", icon: <Monitor className="h-4 w-4" />, status: "passed" },
    { name: "Desktop Firefox", icon: <Monitor className="h-4 w-4" />, status: "passed" },
    { name: "Desktop Safari", icon: <Monitor className="h-4 w-4" />, status: "warning" },
    { name: "Mobile iOS", icon: <Smartphone className="h-4 w-4" />, status: "passed" },
    { name: "Mobile Android", icon: <Smartphone className="h-4 w-4" />, status: "passed" },
    { name: "Tablet iPad", icon: <Tablet className="h-4 w-4" />, status: "passed" }
  ];

  const runTests = async (suiteId?: string) => {
    setIsRunning(true);
    toast({
      title: "Running Tests",
      description: suiteId ? `Running ${suiteId} tests...` : "Running all tests...",
    });

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    setIsRunning(false);
    toast({
      title: "Tests Completed",
      description: "All tests have been executed successfully.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
      default:
        return <div className="h-4 w-4 bg-muted rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      passed: "default",
      failed: "destructive",
      warning: "secondary"
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Testing Dashboard</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Comprehensive testing suite for Doc' O Clock platform quality assurance
        </p>
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => runTests()}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run All Tests
          </Button>
          <Button variant="outline">View Reports</Button>
        </div>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle>Test Execution in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={65} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Running functionality tests... (65% complete)
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suites" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="devices">Device Testing</TabsTrigger>
          <TabsTrigger value="network">Network Tests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-6">
          <div className="grid gap-6">
            {testSuites.map((suite) => (
              <Card key={suite.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {suite.id === "functionality" && <Zap className="h-5 w-5" />}
                        {suite.id === "performance" && <Monitor className="h-5 w-5" />}
                        {suite.id === "accessibility" && <Accessibility className="h-5 w-5" />}
                        {suite.id === "security" && <Shield className="h-5 w-5" />}
                        {suite.name}
                      </CardTitle>
                      <CardDescription>{suite.description}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runTests(suite.id)}
                      disabled={isRunning}
                    >
                      Run Tests
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {suite.tests.map((test, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <span className="font-medium">{test.name}</span>
                          {test.metric && (
                            <Badge variant="outline" className="text-xs">
                              {test.metric}
                            </Badge>
                          )}
                        </div>
                        {getStatusBadge(test.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Device Compatibility</CardTitle>
              <CardDescription>
                Testing across different devices and browsers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deviceTests.map((device, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {device.icon}
                      <span className="font-medium">{device.name}</span>
                    </div>
                    {getStatusIcon(device.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Online Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Fast 3G</span>
                    <Badge>2.1s load</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Regular 4G</span>
                    <Badge>1.8s load</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>WiFi</span>
                    <Badge>1.2s load</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WifiOff className="h-5 w-5" />
                  Offline Functionality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Cached Pages</span>
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Offline Forms</span>
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Sync</span>
                    <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Reports & Analytics</CardTitle>
              <CardDescription>
                Historical test data and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">94%</div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1,247</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">12min</div>
                  <div className="text-sm text-muted-foreground">Avg Runtime</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline">Download Report</Button>
                <Button variant="outline">Export CSV</Button>
                <Button variant="outline">View History</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
