import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Truck, TrendingUp, AlertTriangle, CheckCircle, Plus,
  Search, Filter, Download, RefreshCw, ShoppingCart, Warehouse,
  BarChart3, Clock, DollarSign, Eye, Edit, Trash2, ArrowUpRight
} from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInstitutionContext } from "@/hooks/useInstitutionContext";

interface SupplierPerformance {
  id: string;
  supplier_id: string;
  institution_id: string;
  rating: number;
  on_time_delivery_rate: number;
  quality_score: number;
  price_competitiveness: number;
  total_orders: number;
  total_deliveries: number;
  supplier?: {
    name: string;
    contact_person?: string;
    phone?: string;
  };
}

interface PurchaseOrder {
  id: string;
  institution_id: string;
  supplier_id?: string;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  supplier?: {
    name: string;
  };
}

interface InventoryReconciliation {
  id: string;
  institution_id: string;
  reconciliation_date: string;
  reconciled_by?: string;
  total_items_checked: number;
  discrepancies_found: number;
  total_discrepancy_value: number;
  status: string;
}

export const EnhancedInventory = () => {
  const navigate = useNavigate();
  const { institution } = useInstitutionContext();
  const [loading, setLoading] = useState(true);
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformance[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [reconciliations, setReconciliations] = useState<InventoryReconciliation[]>([]);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showReconciliationDialog, setShowReconciliationDialog] = useState(false);

  // Form states
  const [orderForm, setOrderForm] = useState({
    supplier_id: "",
    expected_delivery_date: "",
    payment_terms: "",
    shipping_address: "",
    notes: "",
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    notes: "",
  });

  useEffect(() => {
    if (institution) {
      fetchInventoryData();
    }
  }, [institution]);

  const fetchInventoryData = async () => {
    if (!institution) return;

    try {
      const [suppliersRes, ordersRes, reconciliationsRes] = await Promise.all([
        supabase
          .from("supplier_performance")
          .select(`
            *,
            supplier:suppliers(name, contact_person, phone)
          `)
          .eq("institution_id", institution.id)
          .order("rating", { ascending: false }),
        supabase
          .from("purchase_orders")
          .select(`
            *,
            supplier:suppliers(name)
          `)
          .eq("institution_id", institution.id)
          .order("order_date", { ascending: false })
          .limit(50),
        supabase
          .from("inventory_reconciliation")
          .select("*")
          .eq("institution_id", institution.id)
          .order("reconciliation_date", { ascending: false })
          .limit(20),
      ]);

      if (suppliersRes.data) setSupplierPerformance(suppliersRes.data);
      if (ordersRes.data) setPurchaseOrders(ordersRes.data);
      if (reconciliationsRes.data) setReconciliations(reconciliationsRes.data);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("purchase_orders").insert({
        institution_id: institution.id,
        supplier_id: orderForm.supplier_id || null,
        order_number: `PO-${Date.now()}`,
        expected_delivery_date: orderForm.expected_delivery_date || null,
        payment_terms: orderForm.payment_terms,
        shipping_address: orderForm.shipping_address,
        notes: orderForm.notes,
        status: "pending",
      });

      if (error) throw error;
      setShowOrderDialog(false);
      fetchInventoryData();
    } catch (error) {
      console.error("Error creating order:", error);
    }
  };

  const handleCreateReconciliation = async () => {
    if (!institution) return;

    try {
      const { error } = await supabase.from("inventory_reconciliation").insert({
        institution_id: institution.id,
        reconciliation_date: new Date().toISOString().split('T')[0],
        notes: reconciliationForm.notes,
        status: "pending",
      });

      if (error) throw error;
      setShowReconciliationDialog(false);
      fetchInventoryData();
    } catch (error) {
      console.error("Error creating reconciliation:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": case "received": return "bg-[#00c875] text-white";
      case "pending": case "in_progress": return "bg-[#0073ea] text-white";
      case "flagged": case "partial_received": return "bg-[#fdab3d] text-white";
      case "cancelled": return "bg-[#e44258] text-white";
      default: return "bg-[#676879] text-white";
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-[#00c875]";
    if (rating >= 3) return "text-[#fdab3d]";
    return "text-[#e44258]";
  };

  if (loading) return <LoadingScreen />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Warehouse className="h-12 w-12 mx-auto text-[#0073ea]" />
            <h2 className="text-xl font-extrabold">Institution Required</h2>
            <p className="text-xs text-[#676879]">Please select an institution to access enhanced inventory.</p>
            <Button onClick={() => navigate("/institution-portal")} className="bg-[#0073ea] hover:bg-[#0056b3]">
              Go to Institution Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avgSupplierRating = supplierPerformance.length > 0
    ? supplierPerformance.reduce((sum, s) => sum + s.rating, 0) / supplierPerformance.length
    : 0;
  const pendingOrders = purchaseOrders.filter((o) => o.status === "pending").length;
  const totalOrderValue = purchaseOrders.reduce((sum, o) => sum + o.final_amount, 0);
  const openDiscrepancies = reconciliations.filter((r) => r.status !== "completed").length;

  return (
    <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Enhanced Inventory</h1>
              <p className="text-xs text-[#676879] font-medium">Supply Chain & Purchase Order Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold text-xs flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Purchase Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Create Purchase Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Supplier</Label>
                    <Select
                      value={orderForm.supplier_id}
                      onValueChange={(value) => setOrderForm({ ...orderForm, supplier_id: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierPerformance.map((sp) => (
                          <SelectItem key={sp.supplier_id} value={sp.supplier_id}>
                            {sp.supplier?.name} (Rating: {sp.rating.toFixed(1)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Expected Delivery Date</Label>
                    <Input
                      type="date"
                      value={orderForm.expected_delivery_date}
                      onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Payment Terms</Label>
                    <Input
                      value={orderForm.payment_terms}
                      onChange={(e) => setOrderForm({ ...orderForm, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Shipping Address</Label>
                    <Textarea
                      value={orderForm.shipping_address}
                      onChange={(e) => setOrderForm({ ...orderForm, shipping_address: e.target.value })}
                      placeholder="Delivery address..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      placeholder="Additional notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateOrder} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Create Purchase Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showReconciliationDialog} onOpenChange={setShowReconciliationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-xs font-bold">
                  <RefreshCw className="h-4 w-4 mr-1" /> Reconcile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-extrabold">Start Inventory Reconciliation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-xs font-bold">Notes</Label>
                    <Textarea
                      value={reconciliationForm.notes}
                      onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                      placeholder="Reconciliation notes..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCreateReconciliation} className="w-full bg-[#0073ea] hover:bg-[#0056b3] text-white font-bold">
                    Start Reconciliation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Avg Supplier Rating</span>
                <TrendingUp className="h-4 w-4 text-[#00c875]" />
              </div>
              <div className={`text-2xl font-black font-mono ${getRatingColor(avgSupplierRating)}`}>
                {avgSupplierRating.toFixed(1)}
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">{supplierPerformance.length} suppliers</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Pending Orders</span>
                <ShoppingCart className="h-4 w-4 text-[#0073ea]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#0073ea]">{pendingOrders}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Awaiting processing</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Total Order Value</span>
                <DollarSign className="h-4 w-4 text-[#a25ddc]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#a25ddc]">
                {institution.currency || "ZMW"} {(totalOrderValue / 1000).toFixed(1)}k
              </div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">All orders</div>
            </CardContent>
          </Card>
          <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-[#676879] uppercase">Open Discrepancies</span>
                <AlertTriangle className="h-4 w-4 text-[#e44258]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#e44258]">{openDiscrepancies}</div>
              <div className="text-[10px] text-[#676879] font-bold mt-0.5">Require resolution</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suppliers" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-900 border border-[#e6e9ef] dark:border-slate-800 p-1">
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <Truck className="h-4 w-4 mr-2" /> Supplier Performance
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <ShoppingCart className="h-4 w-4 mr-2" /> Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <RefreshCw className="h-4 w-4 mr-2" /> Reconciliation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#0073ea] data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          {/* Supplier Performance Tab */}
          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search suppliers..." className="w-64 h-9 text-xs" />
                <Select defaultValue="rating">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Sort by Rating</SelectItem>
                    <SelectItem value="delivery">Sort by Delivery</SelectItem>
                    <SelectItem value="quality">Sort by Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierPerformance.map((supplier) => (
                <Card key={supplier.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-extrabold">{supplier.supplier?.name}</CardTitle>
                          <div className="text-[10px] text-[#676879]">{supplier.supplier?.contact_person}</div>
                        </div>
                      </div>
                      <div className={`text-2xl font-black font-mono ${getRatingColor(supplier.rating)}`}>
                        {supplier.rating.toFixed(1)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-[#f0f2f7] dark:bg-slate-800 p-2">
                        <div className="text-[10px] text-[#676879]">Delivery</div>
                        <div className="text-sm font-bold text-[#00c875]">{(supplier.on_time_delivery_rate * 100).toFixed(0)}%</div>
                      </div>
                      <div className="rounded-lg bg-[#f0f2f7] dark:bg-slate-800 p-2">
                        <div className="text-[10px] text-[#676879]">Quality</div>
                        <div className="text-sm font-bold text-[#0073ea]">{supplier.quality_score.toFixed(1)}</div>
                      </div>
                      <div className="rounded-lg bg-[#f0f2f7] dark:bg-slate-800 p-2">
                        <div className="text-[10px] text-[#676879]">Price</div>
                        <div className="text-sm font-bold text-[#a25ddc]">{supplier.price_competitiveness.toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <span className="text-[#676879]">{supplier.total_orders} orders • {supplier.total_deliveries} deliveries</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input placeholder="Search orders..." className="w-64 h-9 text-xs" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <Filter className="h-4 w-4 mr-1" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>
            </div>

            <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#f0f2f7] dark:bg-slate-800">
                  <tr>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Order #</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Supplier</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Order Date</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Expected</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Status</th>
                    <th className="text-left text-xs font-extrabold px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((order) => (
                    <tr key={order.id} className="border-t border-[#e6e9ef] dark:border-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold">{order.order_number}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{order.supplier?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#676879]">
                        {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        {institution.currency || "ZMW"} {order.final_amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(order.status) + " text-[10px]"}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Inventory Reconciliations</h3>
              <div className="flex items-center gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reconciliations.map((reconciliation) => (
                <Card key={reconciliation.id} className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-[#0073ea]" />
                          {new Date(reconciliation.reconciliation_date).toLocaleDateString()}
                        </CardTitle>
                        <div className="text-[10px] text-[#676879] mt-1">
                          {reconciliation.total_items_checked} items checked
                        </div>
                      </div>
                      <Badge className={getStatusColor(reconciliation.status) + " text-[10px]"}>
                        {reconciliation.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-[#676879]">Discrepancies Found</div>
                        <div className="text-sm font-bold text-[#e44258]">{reconciliation.discrepancies_found}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#676879]">Total Value</div>
                        <div className="text-sm font-bold text-[#fdab3d]">
                          {institution.currency || "ZMW"} {reconciliation.total_discrepancy_value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#e6e9ef] dark:border-slate-800">
                      <div className="text-xs text-[#676879]">{reconciliation.notes || "No notes"}</div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#0073ea]" /> Supply Chain Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center text-[#676879] text-xs">
                    Supply chain analytics chart placeholder
                  </div>
                </CardContent>
              </Card>
              <Card className="border-[#e6e9ef] dark:border-slate-800 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0073ea]" /> Cost Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Avg Order Value</span>
                      <span className="font-bold text-[#00c875]">
                        {purchaseOrders.length > 0 ? (totalOrderValue / purchaseOrders.length).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">On-Time Delivery Rate</span>
                      <span className="font-bold text-[#0073ea]">
                        {supplierPerformance.length > 0 
                          ? (supplierPerformance.reduce((sum, s) => sum + s.on_time_delivery_rate, 0) / supplierPerformance.length * 100).toFixed(0)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#676879]">Discrepancy Rate</span>
                      <span className="font-bold text-[#a25ddc]">
                        {reconciliations.length > 0 
                          ? (reconciliations.reduce((sum, r) => sum + r.discrepancies_found, 0) / reconciliations.reduce((sum, r) => sum + r.total_items_checked, 1) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedInventory;