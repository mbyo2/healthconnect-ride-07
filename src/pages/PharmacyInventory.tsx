
import { useState } from "react";
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
  Clock,
  TrendingUp,
  Filter,
  Loader2,
  Calendar,
  BarChart3,
  FileText,
  Pill
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const PharmacyInventory = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Get pharmacy information
  const { data: pharmacy, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy-info', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('healthcare_institutions' as any)
        .select('*')
        .eq('admin_id', user.id)
        .eq('type', 'pharmacy')
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!user
  });

  // Get inventory data
  const { data: medications = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['pharmacy-inventory', (pharmacy as any)?.id],
    queryFn: async () => {
      if (!pharmacy) return [];
      const { data, error } = await supabase
        .from('pharmacy_inventory' as any)
        .select(`
          *,
          supplier:pharmacy_suppliers(name)
        `)
        .eq('pharmacy_id', (pharmacy as any).id)
        .order('product_name');

      if (error) throw error;

      // Map to UI format
      return ((data as any) || []).map((item: any) => ({
        id: item.id,
        name: item.product_name,
        category: item.category,
        quantity: item.quantity,
        minStock: item.reorder_level,
        expiry: item.expiry_date,
        supplier: item.supplier?.name || "Unknown",
        status: item.quantity > item.reorder_level ? "In Stock" : item.quantity > 0 ? "Low Stock" : "Out of Stock"
      }));
    },
    enabled: !!pharmacy
  });

  const isLoading = pharmacyLoading || inventoryLoading;

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = medications.filter(med => med.quantity <= med.minStock);
  const expiringItems = medications.filter(med => {
    if (!med.expiry) return false;
    const expiryDate = new Date(med.expiry);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200";
      case "Low Stock":
        return "bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200";
      case "Out of Stock":
        return "bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
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
      title: "Inventory Value",
      value: "Calculated",
      icon: <TrendingUp className="h-5 w-5" />
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pharmacy && !pharmacyLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pharmacy Found</h3>
            <p className="text-muted-foreground">
              You are not associated with any pharmacy. Please contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Inventory</h1>
          <p className="text-muted-foreground mt-2">
            Manage your medication stock and supplies for {(pharmacy as any)?.name}
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
                  <Input
                    placeholder="Search medications..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredMedications.length > 0 ? (
                  filteredMedications.map((medication) => (
                    <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Pill className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{medication.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {medication.category} • Expires: {medication.expiry ? new Date(medication.expiry).toLocaleDateString() : 'N/A'}
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No medications found matching your search.
                  </div>
                )}
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
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((medication) => (
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No low stock items found.
                  </div>
                )}
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
                {expiringItems.length > 0 ? (
                  expiringItems.map((medication) => (
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
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No expiring medications found.
                  </div>
                )}
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
                    {Object.entries(
                      medications.reduce((acc: any, med: any) => {
                        acc[med.category] = (acc[med.category] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a: any, b: any) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([category, count]: any) => (
                        <div key={category} className="flex justify-between">
                          <span>{category}</span>
                          <span className="font-semibold">
                            {Math.round((count / medications.length) * 100)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Monthly Usage</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-muted-foreground italic">
                      <span>Usage data will appear here once sales are recorded</span>
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
};

export default PharmacyInventory;
