import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
    Package, ShoppingCart, TrendingUp, AlertTriangle,
    Plus, Search, DollarSign, Users, Barcode
} from 'lucide-react';

const PharmacyManagement = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    // Get pharmacy info
    const { data: pharmacy } = useQuery({
        queryKey: ['pharmacy', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('healthcare_institutions')
                .select('*')
                .eq('admin_id', user?.id)
                .eq('type', 'pharmacy')
                .single();
            return data;
        },
        enabled: !!user
    });

    // Get inventory
    const { data: inventory } = useQuery({
        queryKey: ['pharmacy-inventory', pharmacy?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('pharmacy_inventory')
                .select('*')
                .eq('pharmacy_id', pharmacy?.id)
                .order('product_name');
            return data || [];
        },
        enabled: !!pharmacy
    });

    // Get today's sales
    const { data: todaySales } = useQuery({
        queryKey: ['pharmacy-sales-today', pharmacy?.id],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('pharmacy_sales')
                .select('*')
                .eq('pharmacy_id', pharmacy?.id)
                .gte('created_at', today)
                .order('created_at', { ascending: false });
            return data || [];
        },
        enabled: !!pharmacy
    });

    // Calculate stats
    const lowStockItems = inventory?.filter(item => item.quantity <= item.reorder_level) || [];
    const expiringItems = inventory?.filter(item => {
        if (!item.expiry_date) return false;
        const daysUntilExpiry = Math.floor((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }) || [];

    const todayRevenue = todaySales?.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0) || 0;

    if (!pharmacy) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Pharmacy Found</h3>
                        <p className="text-muted-foreground">
                            You don't have access to a pharmacy management system.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{pharmacy.name} - PMS</h1>
                <p className="text-muted-foreground">Pharmacy Management System</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Total Products
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inventory?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            Low Stock
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-500">{lowStockItems.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Today's Sales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todaySales?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Today's Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">K{todayRevenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="pos">POS</TabsTrigger>
                    <TabsTrigger value="sales">Sales</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle>Inventory Management</CardTitle>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Product
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {inventory && inventory.length > 0 ? (
                                <div className="space-y-2">
                                    {inventory
                                        .filter(item =>
                                            item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            item.product_code.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((item) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-accent transition-colors gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold">{item.product_name}</h4>
                                                        {item.quantity <= item.reorder_level && (
                                                            <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">Code: {item.product_code}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span>Stock: <strong>{item.quantity}</strong></span>
                                                        <span>Price: <strong>K{item.unit_price}</strong></span>
                                                        {item.expiry_date && (
                                                            <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm">Edit</Button>
                                                    <Button variant="outline" size="sm">
                                                        <Barcode className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No products in inventory</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    {(lowStockItems.length > 0 || expiringItems.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {lowStockItems.length > 0 && (
                                <Card className="border-orange-200">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            Low Stock Alert
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {lowStockItems.slice(0, 5).map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.product_name}</span>
                                                    <Badge variant="outline">{item.quantity} left</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {expiringItems.length > 0 && (
                                <Card className="border-red-200">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            Expiring Soon
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {expiringItems.slice(0, 5).map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.product_name}</span>
                                                    <Badge variant="outline">
                                                        {Math.floor((new Date(item.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* POS Tab */}
                <TabsContent value="pos">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Product Selection */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Select Products</CardTitle>
                                <div className="relative mt-2">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products by name or code..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                                    {inventory
                                        ?.filter(item =>
                                            item.quantity > 0 &&
                                            (item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                item.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
                                        )
                                        .map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors flex justify-between items-center"
                                                onClick={() => {
                                                    // Add to cart logic would go here
                                                    // For now we'll just show a toast
                                                    // toast.success(`Added ${item.product_name} to cart`);
                                                }}
                                            >
                                                <div>
                                                    <h4 className="font-semibold">{item.product_name}</h4>
                                                    <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                                    <p className="text-sm font-medium mt-1">K{item.unit_price}</p>
                                                </div>
                                                <Button size="sm" variant="secondary">Add</Button>
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Current Sale
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col h-[500px]">
                                <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                                    {/* Mock Cart Items */}
                                    <div className="text-center text-muted-foreground py-8">
                                        Cart is empty
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>K0.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Tax (16%)</span>
                                        <span>K0.00</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>K0.00</span>
                                    </div>
                                    <Button className="w-full" size="lg" disabled>
                                        Complete Sale
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Sales Tab */}
                <TabsContent value="sales">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {todaySales && todaySales.length > 0 ? (
                                <div className="space-y-2">
                                    {todaySales.map((sale) => (
                                        <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <p className="font-medium">Transaction #{sale.transaction_id}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(sale.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">K{Number(sale.total_amount).toFixed(2)}</p>
                                                <Badge>{sale.payment_method}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No sales today</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reports & Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12">
                                <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    Detailed reports and analytics coming soon
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PharmacyManagement;
