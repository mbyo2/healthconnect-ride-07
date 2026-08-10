import React, { useState } from 'react';
import { toast } from 'sonner';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from "@/hooks/use-currency";
import {
    Package, ShoppingCart, TrendingUp, AlertTriangle,
    Plus, Search, DollarSign, Users, Barcode, CheckCircle,
    Percent, CreditCard, Smartphone, ShieldCheck, RefreshCw,
    XCircle, Trash2, ArrowUpRight, ShieldAlert, Sparkles, Loader2
} from 'lucide-react';
import { InstitutionInsuranceVerification } from '@/components/institution/InstitutionInsuranceVerification';

const TAX_RATE = 0.16;

export const PharmacyManagement = () => {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState<any[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile_money' | 'insurance'>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedVerification, setSelectedVerification] = useState<any>(null);
    const [patientSearchTerm, setPatientSearchTerm] = useState('');

    // Write-off modal state
    const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
    const [writeOffForm, setWriteOffForm] = useState({
        item_id: '',
        quantity: 1,
        reason: 'expired',
        notes: ''
    });

    // Get pharmacy info
    const { data: pharmacy } = useQuery({
        queryKey: ['pharmacy', user?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('healthcare_institutions')
                .select('*')
                .eq('admin_id', user?.id)
                .eq('type', 'pharmacy')
                .maybeSingle();
            return data;
        },
        enabled: !!user
    });

    // Get inventory
    const { data: inventory = [], refetch: refetchInventory } = useQuery({
        queryKey: ['pharmacy-inventory', pharmacy?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('pharmacy_inventory' as any)
                .select('*')
                .eq('pharmacy_id', pharmacy?.id)
                .order('product_name');
            return (data as any[]) || [];
        },
        enabled: !!pharmacy
    });

    // Get today's sales
    const { data: todaySales = [] } = useQuery({
        queryKey: ['pharmacy-sales-today', pharmacy?.id],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('pharmacy_sales' as any)
                .select('*')
                .eq('pharmacy_id', pharmacy?.id)
                .gte('created_at', today)
                .order('created_at', { ascending: false });
            return (data as any[]) || [];
        },
        enabled: !!pharmacy
    });

    // Get stock audit / transactions (for expired & damaged write-offs)
    const { data: writeOffLogs = [], refetch: refetchLogs } = useQuery({
        queryKey: ['pharmacy-writeoffs', pharmacy?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('inventory_transactions' as any)
                .select('*')
                .in('transaction_type', ['expired', 'damaged', 'adjustment'])
                .order('created_at', { ascending: false });
            return (data as any[]) || [];
        },
        enabled: !!pharmacy
    });

    // Get patients for selection
    const { data: patients } = useQuery({
        queryKey: ['pharmacy-patients'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email')
                .limit(50);
            return data || [];
        }
    });

    // Stock metrics & Profit Margins
    const lowStockItems = inventory.filter(item => (item.quantity ?? 0) <= (item.reorder_level ?? 10));
    const expiredItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        return new Date(item.expiry_date).getTime() <= Date.now();
    });
    const nearExpiryItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const diffDays = Math.floor((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 30;
    });

    const totalRetailValue = inventory.reduce((s, i) => s + ((Number(i.unit_price) || 0) * (Number(i.quantity) || 0)), 0);
    const totalCostValue = inventory.reduce((s, i) => s + ((Number(i.cost_price || i.unit_price * 0.6) || 0) * (Number(i.quantity) || 0)), 0);
    const totalExpectedProfit = totalRetailValue - totalCostValue;
    const avgProfitMarginPct = totalCostValue > 0 ? ((totalExpectedProfit / totalCostValue) * 100) : 0;

    const todayRevenue = todaySales.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);

    // POS Cart Actions
    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.cartQuantity >= item.quantity) {
                    toast.error(`Cannot add more. Only ${item.quantity} in stock.`);
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
            }
            return [...prev, { ...item, cartQuantity: 1 }];
        });
        toast.success(`Added ${item.product_name} to cart`);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateCartQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(id);
            return;
        }
        setCart(prev => prev.map(item => item.id === id ? { ...item, cartQuantity: quantity } : item));
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.cartQuantity), 0);
    const cartCostTotal = cart.reduce((sum, item) => sum + ((item.cost_price || item.unit_price * 0.6) * item.cartQuantity), 0);
    const cartProfitMargin = cartSubtotal - cartCostTotal;
    const cartTax = cartSubtotal * TAX_RATE;
    const cartTotal = cartSubtotal + cartTax;

    const completeSale = async () => {
        if (cart.length === 0 || !pharmacy) return;
        setIsProcessing(true);
        try {
            const transactionId = `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

            const total = cartTotal;
            let balance = total;
            let insuranceClaimId = null;

            if (selectedVerification) {
                const coverage = selectedVerification.coverage_percentage || 0;
                const coveredAmount = (total * coverage) / 100;
                balance = total - coveredAmount;
                insuranceClaimId = selectedVerification.id;
            }

            // 1. Create sale record
            const { error: saleError } = await supabase
                .from('pharmacy_sales' as any)
                .insert({
                    pharmacy_id: pharmacy.id,
                    transaction_id: transactionId,
                    customer_id: selectedPatientId || null,
                    items: cart,
                    subtotal: cartSubtotal,
                    tax: cartTax,
                    total_amount: total,
                    balance: balance,
                    paid_amount: total - balance,
                    insurance_claim_id: insuranceClaimId,
                    payment_method: paymentMethod,
                    payment_status: balance === 0 ? 'completed' : 'pending',
                    created_at: new Date().toISOString(),
                });

            if (saleError) throw saleError;

            // 2. Update inventory stock & insert sales transaction
            for (const item of cart) {
                const newQty = Math.max(0, item.quantity - item.cartQuantity);
                await supabase
                    .from('pharmacy_inventory' as any)
                    .update({ quantity: newQty })
                    .eq('id', item.id);

                await (supabase.from('inventory_transactions' as any) as any).insert({
                    medication_inventory_id: item.id,
                    transaction_type: 'sale',
                    quantity: item.cartQuantity,
                    unit_price: item.unit_price,
                    notes: `POS Sale ${transactionId}`,
                    created_at: new Date().toISOString(),
                });
            }

            toast.success(`Sale completed! Receipt ${transactionId}`);
            setCart([]);
            setSelectedPatientId('');
            setSelectedVerification(null);
            refetchInventory();
        } catch (error: any) {
            console.error('Error completing sale:', error);
            toast.error(error?.message || 'Failed to complete sale');
        } finally {
            setIsProcessing(false);
        }
    };

    // Log Damaged or Expired Stock Write-off
    const handleWriteOffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetItem = inventory.find(i => i.id === writeOffForm.item_id);
        if (!targetItem) {
            toast.error('Select an item to write off');
            return;
        }
        if (writeOffForm.quantity <= 0 || writeOffForm.quantity > targetItem.quantity) {
            toast.error(`Quantity must be between 1 and ${targetItem.quantity}`);
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Reduce inventory
            const updatedQty = Math.max(0, targetItem.quantity - writeOffForm.quantity);
            const { error: invErr } = await supabase
                .from('pharmacy_inventory' as any)
                .update({ quantity: updatedQty })
                .eq('id', targetItem.id);

            if (invErr) throw invErr;

            // 2. Log transaction in inventory_transactions
            const { error: txnErr } = await (supabase.from('inventory_transactions' as any) as any).insert({
                medication_inventory_id: targetItem.id,
                transaction_type: writeOffForm.reason === 'expired' ? 'expired' : 'damaged',
                quantity: writeOffForm.quantity,
                unit_price: targetItem.cost_price || targetItem.unit_price,
                notes: `Write-off (${writeOffForm.reason}): ${writeOffForm.notes || 'Admin write-off'}`,
                created_at: new Date().toISOString(),
            });

            if (txnErr) throw txnErr;

            toast.success(`Wrote off ${writeOffForm.quantity} x ${targetItem.product_name} (${writeOffForm.reason})`);
            setShowWriteOffDialog(false);
            setWriteOffForm({ item_id: '', quantity: 1, reason: 'expired', notes: '' });
            refetchInventory();
            refetchLogs();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to log write-off');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!pharmacy) {
        return (
            <div className="container mx-auto p-6">
                <Card className="border-border">
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

    const categories = ['All', ...Array.from(new Set(inventory.map(i => i.category || 'General').filter(Boolean)))];

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header with Glassmorphism Accent */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 rounded-2xl border border-primary/20 backdrop-blur-md">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
                        <Package className="h-7 w-7 text-primary" />
                        {pharmacy.name} — Modern POS & PMS
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Smart Inventory • Real-time Profit Margins • Damage & Expiry Audit</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { refetchInventory(); refetchLogs(); }}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => setShowWriteOffDialog(true)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1">
                        <ShieldAlert className="h-4 w-4" /> Write-Off / Damages
                    </Button>
                </div>
            </div>

            {/* Financial & Profit Margin Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground">Stock Retail Value</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-xl font-bold text-primary">{formatPrice(totalRetailValue)}</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{inventory.length} total products</p>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-muted-foreground">Stock Cost Value</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-xl font-bold text-foreground">{formatPrice(totalCostValue)}</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Total acquisition cost</p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">Expected Profit <ArrowUpRight className="h-3.5 w-3.5" /></CardTitle></CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(totalExpectedProfit)}</div>
                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-0.5">Avg Margin: +{avgProfitMarginPct.toFixed(1)}%</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-500/20 bg-amber-500/5">
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400">Low & Expiring</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{lowStockItems.length + nearExpiryItems.length} items</div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{lowStockItems.length} low • {nearExpiryItems.length} near expiry</p>
                    </CardContent>
                </Card>

                <Card className="border-destructive/20 bg-destructive/5 col-span-2 sm:col-span-1">
                    <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs font-medium text-destructive">Expired & Damaged</CardTitle></CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-xl font-bold text-destructive">{expiredItems.length} expired</div>
                        <p className="text-[10px] text-destructive/80 mt-0.5">{writeOffLogs.length} audit logs</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pos" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="pos" className="text-xs font-semibold flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Modern POS</TabsTrigger>
                    <TabsTrigger value="inventory" className="text-xs font-semibold flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Inventory & Margins</TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs font-semibold flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Damaged & Expired Audit</TabsTrigger>
                    <TabsTrigger value="sales" className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Sales & Reports</TabsTrigger>
                </TabsList>

                {/* 🛒 MODERN POS TAB */}
                <TabsContent value="pos">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Product Search & Grid */}
                        <Card className="lg:col-span-2 border-border shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        Point of Sale Products
                                    </CardTitle>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search product or code..."
                                            className="pl-8 text-xs h-9"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {/* Category Pills */}
                                <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1">
                                    {categories.map((cat) => (
                                        <Button
                                            key={cat}
                                            size="sm"
                                            variant={selectedCategory === cat ? "default" : "outline"}
                                            className="text-xs h-7 rounded-full px-3"
                                            onClick={() => setSelectedCategory(cat)}
                                        >
                                            {cat}
                                        </Button>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                                    {inventory
                                        .filter(item =>
                                            (selectedCategory === 'All' || (item.category || 'General') === selectedCategory) &&
                                            ((item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                             (item.product_code || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                        )
                                        .map((item) => {
                                            const cost = Number(item.cost_price || item.unit_price * 0.6);
                                            const price = Number(item.unit_price);
                                            const marginPct = cost > 0 ? (((price - cost) / cost) * 100).toFixed(0) : '0';
                                            const isOut = (item.quantity ?? 0) <= 0;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`p-3.5 border rounded-xl transition-all duration-150 flex justify-between items-center ${
                                                        isOut ? 'opacity-50 border-muted bg-muted/20 cursor-not-allowed' : 'hover:border-primary hover:shadow-md cursor-pointer bg-card'
                                                    }`}
                                                    onClick={() => !isOut && addToCart(item)}
                                                >
                                                    <div className="space-y-1 flex-1 pr-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <h4 className="font-semibold text-sm text-foreground leading-tight">{item.product_name}</h4>
                                                            {isOut ? (
                                                                <Badge variant="destructive" className="text-[9px] px-1 py-0">Out</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                                    +{marginPct}% margin
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground">Code: {item.product_code || '—'} • Batch: {item.batch_number || '—'}</p>
                                                        <div className="flex items-center gap-3 text-xs pt-1">
                                                            <span className="font-bold text-foreground text-sm">{formatPrice(price)}</span>
                                                            <span className="text-[11px] text-muted-foreground">Cost: {formatPrice(cost)}</span>
                                                            <span className="text-[11px] text-muted-foreground ml-auto font-medium">Stock: {item.quantity}</span>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant={isOut ? "ghost" : "default"} disabled={isOut} className="h-8 w-8 p-0 rounded-full flex-shrink-0">
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cart & Checkout Box */}
                        <Card className="border-primary/30 shadow-md bg-card flex flex-col justify-between">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Active Cart ({cart.reduce((s, i) => s + i.cartQuantity, 0)})</span>
                                    {cart.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setCart([])} className="h-7 text-xs text-destructive hover:bg-destructive/10">
                                            Clear
                                        </Button>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
                                {/* Cart Items List */}
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    {cart.length > 0 ? (
                                        cart.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg border bg-background/50 text-xs">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-medium text-foreground">{item.product_name}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {formatPrice(item.unit_price)} × {item.cartQuantity} = <span className="font-semibold text-foreground">{formatPrice(item.unit_price * item.cartQuantity)}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}>-</Button>
                                                    <span className="font-bold w-4 text-center">{item.cartQuantity}</span>
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}>+</Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-10 text-xs">
                                            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            Cart is empty. Click any product to add to cart.
                                        </div>
                                    )}
                                </div>

                                {/* Patient & Insurance Verification */}
                                <div className="space-y-2 border-t pt-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-muted-foreground uppercase">Patient Search (Optional)</Label>
                                        <Input
                                            placeholder="Search patient name..."
                                            value={patientSearchTerm}
                                            onChange={(e) => setPatientSearchTerm(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                        {patientSearchTerm && (
                                            <div className="max-h-28 overflow-y-auto border rounded-md bg-background text-xs">
                                                {patients?.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearchTerm.toLowerCase())).map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="p-1.5 hover:bg-accent cursor-pointer"
                                                        onClick={() => { setSelectedPatientId(p.id); setPatientSearchTerm(`${p.first_name} ${p.last_name}`); }}
                                                    >
                                                        {p.first_name} {p.last_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {selectedPatientId && (
                                        <div className="space-y-1">
                                            <InstitutionInsuranceVerification patientId={selectedPatientId} onVerified={(v) => setSelectedVerification(v)} />
                                            {selectedVerification && (
                                                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[11px] flex items-center gap-1.5">
                                                    <CheckCircle className="h-3 w-3" />
                                                    <span>Insurance Applied: {selectedVerification.coverage_percentage}% Coverage</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Payment Method Selector */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-medium text-muted-foreground uppercase">Payment Method</Label>
                                        <div className="grid grid-cols-4 gap-1">
                                            <Button size="sm" type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="text-[10px] h-7 px-1" onClick={() => setPaymentMethod('cash')}>
                                                <DollarSign className="h-3 w-3 mr-0.5" /> Cash
                                            </Button>
                                            <Button size="sm" type="button" variant={paymentMethod === 'mobile_money' ? 'default' : 'outline'} className="text-[10px] h-7 px-1" onClick={() => setPaymentMethod('mobile_money')}>
                                                <Smartphone className="h-3 w-3 mr-0.5" /> Mobile
                                            </Button>
                                            <Button size="sm" type="button" variant={paymentMethod === 'card' ? 'default' : 'outline'} className="text-[10px] h-7 px-1" onClick={() => setPaymentMethod('card')}>
                                                <CreditCard className="h-3 w-3 mr-0.5" /> Card
                                            </Button>
                                            <Button size="sm" type="button" variant={paymentMethod === 'insurance' ? 'default' : 'outline'} className="text-[10px] h-7 px-1" onClick={() => setPaymentMethod('insurance')}>
                                                <ShieldCheck className="h-3 w-3 mr-0.5" /> Insure
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Financial Totals */}
                                    <div className="space-y-1.5 text-xs pt-2 border-t">
                                        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(cartSubtotal)}</span></div>
                                        <div className="flex justify-between text-muted-foreground"><span>Tax (16%)</span><span>{formatPrice(cartTax)}</span></div>
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium"><span>Cart Profit Margin</span><span>+{formatPrice(cartProfitMargin)}</span></div>
                                        <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t"><span>Total Due</span><span className="text-primary">{formatPrice(cartTotal)}</span></div>
                                    </div>

                                    <Button
                                        className="w-full h-10 text-sm font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        disabled={cart.length === 0 || isProcessing}
                                        onClick={completeSale}
                                    >
                                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                        Complete POS Sale ({formatPrice(cartTotal)})
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* 📊 INVENTORY & PROFIT MARGINS TAB */}
                <TabsContent value="inventory" className="space-y-4">
                    <Card className="border-border">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <CardTitle className="text-lg">Inventory & Profit Margins</CardTitle>
                                    <CardDescription>View cost price, retail price, stock level, and calculated profit margins</CardDescription>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search stock..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 text-xs h-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b bg-muted/30 text-left text-muted-foreground font-semibold">
                                            <th className="p-2.5">Product Name</th>
                                            <th className="p-2.5">Code / Category</th>
                                            <th className="p-2.5">Stock Qty</th>
                                            <th className="p-2.5">Cost Price</th>
                                            <th className="p-2.5">Selling Price</th>
                                            <th className="p-2.5">Profit Margin</th>
                                            <th className="p-2.5">Total Value</th>
                                            <th className="p-2.5 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {inventory
                                            .filter(i => (i.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((item) => {
                                                const cost = Number(item.cost_price || item.unit_price * 0.6);
                                                const price = Number(item.unit_price);
                                                const margin = price - cost;
                                                const marginPct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '0';
                                                const totalItemVal = price * (item.quantity ?? 0);

                                                return (
                                                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="p-2.5 font-medium text-foreground">{item.product_name}</td>
                                                        <td className="p-2.5 text-muted-foreground">{item.product_code || '—'} • {item.category || 'General'}</td>
                                                        <td className="p-2.5 font-bold text-foreground">{item.quantity ?? 0}</td>
                                                        <td className="p-2.5 text-muted-foreground">{formatPrice(cost)}</td>
                                                        <td className="p-2.5 font-semibold text-foreground">{formatPrice(price)}</td>
                                                        <td className="p-2.5">
                                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                                                +{formatPrice(margin)} ({marginPct}%)
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2.5 font-bold text-primary">{formatPrice(totalItemVal)}</td>
                                                        <td className="p-2.5 text-right">
                                                            {(item.quantity ?? 0) <= (item.reorder_level ?? 10) ? (
                                                                <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-[10px]">Active</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 🚨 DAMAGED & EXPIRED AUDIT TAB FOR ADMINS */}
                <TabsContent value="audit" className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-destructive" />
                                Damaged & Expired Stock Write-Off Audit
                            </h3>
                            <p className="text-xs text-muted-foreground">Track inventory write-offs, damaged vials, expired drugs, and financial loss metrics</p>
                        </div>
                        <Button onClick={() => setShowWriteOffDialog(true)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1 text-xs">
                            <Plus className="h-3.5 w-3.5" /> Log Stock Write-Off
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Expired Stock Warning */}
                        <Card className="border-destructive/30 bg-destructive/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    Expired Items ({expiredItems.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {expiredItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No expired stock currently in inventory.</p>
                                ) : (
                                    expiredItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-2 rounded bg-background border text-xs">
                                            <div>
                                                <p className="font-semibold text-foreground">{item.product_name}</p>
                                                <p className="text-[10px] text-muted-foreground">Expiry: {item.expiry_date} • Batch: {item.batch_number || '—'}</p>
                                            </div>
                                            <Badge variant="destructive">{item.quantity} units</Badge>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Near Expiry Warning */}
                        <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    Near Expiry Warning ({nearExpiryItems.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {nearExpiryItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">No items near expiry (within 30 days).</p>
                                ) : (
                                    nearExpiryItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-2 rounded bg-background border text-xs">
                                            <div>
                                                <p className="font-semibold text-foreground">{item.product_name}</p>
                                                <p className="text-[10px] text-muted-foreground">Expiry: {item.expiry_date} • Qty: {item.quantity}</p>
                                            </div>
                                            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">Near Expiry</Badge>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Write-Off Audit Logs */}
                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle className="text-base">Audit Log of Written-off / Damaged Stock</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {writeOffLogs.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">No write-offs logged yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {writeOffLogs.map(log => (
                                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-xs">
                                            <div>
                                                <p className="font-semibold text-foreground">{log.notes || 'Stock Write-off'}</p>
                                                <p className="text-muted-foreground text-[10px]">{new Date(log.created_at || log.transaction_date).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={log.transaction_type === 'expired' ? 'destructive' : 'secondary'} className="capitalize">
                                                    {log.transaction_type}
                                                </Badge>
                                                <span className="font-bold text-foreground">-{log.quantity} units</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 📈 SALES & REPORTS TAB */}
                <TabsContent value="sales">
                    <Card className="border-border">
                        <CardHeader><CardTitle className="text-base">Today's Sales & Transactions</CardTitle></CardHeader>
                        <CardContent>
                            {todaySales.length > 0 ? (
                                <div className="space-y-2">
                                    {todaySales.map((sale) => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg text-xs">
                                            <div>
                                                <p className="font-semibold text-foreground">Transaction #{sale.transaction_id}</p>
                                                <p className="text-muted-foreground text-[10px]">{new Date(sale.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">{formatPrice(Number(sale.total_amount))}</p>
                                                <Badge variant="outline" className="capitalize text-[10px]">{sale.payment_method}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-8">No sales recorded today.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 📝 WRITE-OFF / DAMAGED STOCK MODAL FOR ADMINS */}
            <Dialog open={showWriteOffDialog} onOpenChange={setShowWriteOffDialog}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Log Stock Write-Off / Damage
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWriteOffSubmit} className="space-y-3 py-2 text-xs">
                        <div>
                            <Label className="text-xs font-medium">Select Product *</Label>
                            <Select value={writeOffForm.item_id} onValueChange={v => setWriteOffForm({ ...writeOffForm, item_id: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose product..." /></SelectTrigger>
                                <SelectContent>
                                    {inventory.map(i => (
                                        <SelectItem key={i.id} value={i.id} className="text-xs">
                                            {i.product_name} (Stock: {i.quantity})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs font-medium">Quantity to Write Off *</Label>
                                <Input type="number" value={writeOffForm.quantity} onChange={e => setWriteOffForm({ ...writeOffForm, quantity: Number(e.target.value) })} min={1} className="h-8 text-xs" required />
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Reason *</Label>
                                <Select value={writeOffForm.reason} onValueChange={v => setWriteOffForm({ ...writeOffForm, reason: v })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="expired">Expired Stock</SelectItem>
                                        <SelectItem value="damaged">Damaged in Transit</SelectItem>
                                        <SelectItem value="broken">Broken Vial/Bottle</SelectItem>
                                        <SelectItem value="temperature">Storage Temp Failure</SelectItem>
                                        <SelectItem value="stolen">Stolen / Missing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Audit Notes / Explanation</Label>
                            <Textarea value={writeOffForm.notes} onChange={e => setWriteOffForm({ ...writeOffForm, notes: e.target.value })} placeholder="Details about damage or disposal..." rows={2} className="text-xs" />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowWriteOffDialog(false)}>Cancel</Button>
                            <Button type="submit" size="sm" variant="destructive" disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                Confirm Write-Off
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PharmacyManagement;
