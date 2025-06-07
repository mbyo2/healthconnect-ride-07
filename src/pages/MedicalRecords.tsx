
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

export default function MedicalRecords() {
  const records = [
    {
      id: 1,
      title: "Annual Physical Examination",
      date: "2024-11-15",
      provider: "Dr. Sarah Johnson",
      type: "Examination",
      status: "Complete"
    },
    {
      id: 2,
      title: "Blood Test Results",
      date: "2024-11-10",
      provider: "LabCorp",
      type: "Lab Results",
      status: "Complete"
    },
    {
      id: 3,
      title: "Cardiology Consultation",
      date: "2024-10-28",
      provider: "Dr. Michael Chen",
      type: "Consultation",
      status: "Complete"
    },
    {
      id: 4,
      title: "Prescription - Lisinopril",
      date: "2024-10-25",
      provider: "Dr. Sarah Johnson",
      type: "Prescription",
      status: "Active"
    }
  ];

  const healthMetrics = [
    { label: "Blood Pressure", value: "120/80 mmHg", date: "Nov 15, 2024", status: "Normal" },
    { label: "Cholesterol", value: "185 mg/dL", date: "Nov 10, 2024", status: "Normal" },
    { label: "Blood Sugar", value: "95 mg/dL", date: "Nov 10, 2024", status: "Normal" },
    { label: "BMI", value: "23.5", date: "Nov 15, 2024", status: "Normal" }
  ];

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

  return (
    <div className="container mx-auto py-8 space-y-8">
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
              {records.map((record) => (
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
              ))}
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
              {healthMetrics.map((metric, index) => (
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
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your medical records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Checkup
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Request Records
            </Button>
            <Button variant="outline" className="justify-start">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
            <Button variant="outline" className="justify-start">
              <Heart className="h-4 w-4 mr-2" />
              Health Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
