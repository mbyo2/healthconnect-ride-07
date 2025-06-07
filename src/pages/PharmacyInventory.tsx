
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Search, 
  Plus,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  FileText,
  Pill
} from "lucide-react";

export default function PharmacyInventory() {
  const medications = [
    {
      id: 1,
      name: "Lisinopril 10mg",
      category: "ACE Inhibitor",
      quantity: 150,
      minStock: 50,
      expiry: "2025-08-15",
      supplier: "Generic Pharma",
      status: "In Stock"
    },
    {
      id: 2,
      name: "Metformin 500mg",
      category: "Diabetes",
      quantity: 25,
      minStock: 30,
      expiry: "2025-06-20",
      supplier: "MedSupply Co",
      status: "Low Stock"
    },
    {
      id: 3,
      name: "Amoxicillin 250mg",
      category: "Antibiotic",
      quantity: 80,
      minStock: 40,
      expiry: "2025-03-10",
      supplier: "PharmaCorp",
      status: "In Stock"
    },
    {
      id: 4,
      name: "Ibuprofen 200mg",
      category: "Pain Relief",
      quantity: 15,
      minStock: 25,
      expiry: "2025-12-01",
      supplier: "Generic Pharma",
      status: "Low Stock"
    }
  ];

  const lowStockItems = medications.filter(med => med.quantity <= med.minStock);
  const expiringItems = medications.filter(med => {
    const expiryDate = new Date(med.expiry);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const inventoryStats = [
    {
      title: "Total Medications",
      value: medications.length,
      icon: <Pill className="h-5 w-5" />
    },
    {
      title: "Low Stock Items",
      value: lowStockItems.length,
      icon: <AlertTriangle className="h-5 w-5" />
    },
    {
      title: "Expiring Soon",
      value: expiringItems.length,
      icon: <Calendar className="h-5 w-5" />
    },
    {
      title: "Total Value",
      value: "$12,450",
      icon: <TrendingUp className="h-5 w-5" />
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Manage your medication stock and supplies
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {inventoryStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {stat.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{stat.title}</h3>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="expiring">Expiring</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    All Medications
                  </CardTitle>
                  <CardDescription>
                    Complete list of medications in stock
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search medications..." className="w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {medications.map((medication) => (
                  <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{medication.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {medication.category} • Expires: {new Date(medication.expiry).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supplier: {medication.supplier}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">Qty: {medication.quantity}</p>
                        <p className="text-sm text-muted-foreground">Min: {medication.minStock}</p>
                      </div>
                      <Badge className={getStatusColor(medication.status)}>
                        {medication.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Medications that need to be restocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockItems.map((medication) => (
                  <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg border-yellow-200 bg-yellow-50">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <h3 className="font-semibold">{medication.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Current: {medication.quantity} • Minimum: {medication.minStock}
                        </p>
                      </div>
                    </div>
                    <Button size="sm">
                      Reorder
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Expiring Medications
              </CardTitle>
              <CardDescription>
                Medications expiring within 3 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiringItems.map((medication) => (
                  <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <h3 className="font-semibold">{medication.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Expires: {new Date(medication.expiry).toLocaleDateString()} • Qty: {medication.quantity}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Mark for Disposal
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Inventory Analytics
              </CardTitle>
              <CardDescription>
                Insights and trends for your pharmacy inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Top Categories</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Pain Relief</span>
                      <span className="font-semibold">25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Antibiotics</span>
                      <span className="font-semibold">20%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diabetes</span>
                      <span className="font-semibold">18%</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Monthly Usage</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>November 2024</span>
                      <span className="font-semibold">450 units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>October 2024</span>
                      <span className="font-semibold">420 units</span>
                    </div>
                    <div className="flex justify-between">
                      <span>September 2024</span>
                      <span className="font-semibold">380 units</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
