
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  Upload, 
  Calendar,
  User,
  Heart,
  Activity,
  ClipboardList,
  Pill
} from "lucide-react";
import { getMedicalRecords, getHealthMetrics, type MedicalRecord, type HealthMetric } from "@/services/medicalRecords";
import { useNavigate } from "react-router-dom";
import { ComprehensiveMedicalRecords } from "@/components/patient/ComprehensiveMedicalRecords";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MedicalRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordsData, metricsData] = await Promise.all([
          getMedicalRecords(),
          getHealthMetrics()
        ]);
        setRecords(recordsData);
        setHealthMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching medical records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return "bg-green-100 text-green-800";
      case "Active":
        return "bg-blue-100 text-blue-800";
      case "Complete":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Examination":
        return <User className="h-4 w-4" />;
      case "Lab Results":
        return <Activity className="h-4 w-4" />;
      case "Consultation":
        return <Heart className="h-4 w-4" />;
      case "Prescription":
        return <Pill className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="text-center">Loading your medical records...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 space-y-8">
        {/* New Comprehensive Medical Records Section */}
        <ComprehensiveMedicalRecords />
        
        <Separator />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Medical Records</h1>
          <p className="text-muted-foreground mt-2">
            Access and manage your complete health information
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Record
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Recent Records
              </CardTitle>
              <CardDescription>
                Your latest medical documents and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {records.length > 0 ? records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getTypeIcon(record.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{record.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {record.provider} • {new Date(record.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No medical records found. Upload your first record!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Health Metrics */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Metrics
              </CardTitle>
              <CardDescription>
                Your latest vital signs and test results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {healthMetrics.length > 0 ? healthMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{metric.label}</p>
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <p className="text-xs text-muted-foreground">{metric.date}</p>
                    </div>
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  {index < healthMetrics.length - 1 && <Separator className="mt-4" />}
                </div>
              )) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No health metrics recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions - Responsive Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your medical records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Schedule Checkup</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Request Records</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
            >
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Upload Document</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center justify-start gap-2 h-auto py-3"
              onClick={() => navigate('/health-dashboard')}
            >
              <Heart className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">Health Summary</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </ProtectedRoute>
  );
}
