import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Package, Plus, Edit, Truck, MapPin, Clock, AlertTriangle } from 'lucide-react';

interface PharmacyProduct {
  id?: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  price: number;
  stock_quantity: number;
  requires_prescription: boolean;
  description?: string;
  manufacturer?: string;
  category: string;
  restrictions?: string[];
  can_be_delivered: boolean;
}

interface DeliveryZone {
  id?: string;
  zone_name: string;
  delivery_fee: number;
  max_delivery_time: number;
  restrictions: string[];
}

const PharmacyPortal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newProduct, setNewProduct] = useState<PharmacyProduct>({
    medication_name: '',
    dosage: '',
    price: 0,
    stock_quantity: 0,
    requires_prescription: false,
    category: '',
    can_be_delivered: true
  });
  const [newZone, setNewZone] = useState<DeliveryZone>({
    zone_name: '',
    delivery_fee: 0,
    max_delivery_time: 60,
    restrictions: []
  });

  // Get pharmacy information
  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('admin_id', user.id)
        .eq('type', 'pharmacy')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Get pharmacy products
  const { data: products } = useQuery({
    queryKey: ['pharmacy-products', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy) return [];
      
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('medication_name');

      if (error) throw error;
      return data;
    },
    enabled: !!pharmacy
  });

  // Get delivery zones
  const { data: deliveryZones } = useQuery({
    queryKey: ['delivery-zones', pharmacy?.id],
    queryFn: async () => {
      if (!pharmacy) return [];
      
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('zone_name');

      if (error) throw error;
      return data;
    },
    enabled: !!pharmacy
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (product: PharmacyProduct) => {
      if (!pharmacy) throw new Error('No pharmacy found');
      
      const { data, error } = await supabase
        .from('marketplace_products')
        .insert({
          ...product,
          pharmacy_id: pharmacy.id
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-products'] });
      setNewProduct({
        medication_name: '',
        dosage: '',
        price: 0,
        stock_quantity: 0,
        requires_prescription: false,
        category: '',
        can_be_delivered: true
      });
      toast.success('Product added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add product: ' + error.message);
    }
  });

  // Add delivery zone mutation
  const addZoneMutation = useMutation({
    mutationFn: async (zone: DeliveryZone) => {
      if (!pharmacy) throw new Error('No pharmacy found');
      
      const { data, error } = await supabase
        .from('delivery_zones')
        .insert({
          ...zone,
          pharmacy_id: pharmacy.id,
          coordinates: {} // This would be set up with a map interface
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      setNewZone({
        zone_name: '',
        delivery_fee: 0,
        max_delivery_time: 60,
        restrictions: []
      });
      toast.success('Delivery zone added successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to add delivery zone: ' + error.message);
    }
  });

  const medicationCategories = [
    'Pain Relief',
    'Antibiotics',
    'Vitamins & Supplements',
    'Chronic Disease Management',
    'Emergency Medicine',
    'Children\'s Medicine',
    'Women\'s Health',
    'Men\'s Health',
    'Skin Care',
    'Digestive Health'
  ];

  const deliveryRestrictions = [
    'Controlled substances',
    'Refrigerated medications',
    'High-value medications',
    'Prescription-only medicines',
    'Dangerous goods'
  ];

  if (!pharmacy) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Pharmacy Found</h3>
                  <p className="text-muted-foreground">
                    You don't have access to a pharmacy portal. Please contact support if you believe this is an error.
                  </p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <RoleProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{pharmacy.name} - Pharmacy Portal</h1>
            <p className="text-muted-foreground">
              Manage your pharmacy products, inventory, and delivery services
            </p>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="add-product">Add Product</TabsTrigger>
              <TabsTrigger value="delivery">Delivery Zones</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Your Products ({products?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {products && products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product) => (
                        <Card key={product.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{product.medication_name}</CardTitle>
                              <Badge variant={product.is_active ? "default" : "secondary"}>
                                {product.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{product.dosage}</p>
                            <p className="font-semibold">K{product.price}</p>
                            <p className="text-sm">Stock: {product.stock_quantity}</p>
                            <p className="text-sm">Category: {product.category}</p>
                            
                            <div className="flex flex-wrap gap-1">
                              {product.requires_prescription && (
                                <Badge variant="outline" className="text-xs">Prescription Required</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {product.can_be_delivered ? 'Deliverable' : 'Pickup Only'}
                              </Badge>
                            </div>
                            
                            <Button variant="outline" size="sm" className="w-full mt-2">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Product
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No products added yet. Start by adding your first product.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add Product Tab */}
            <TabsContent value="add-product">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Medication Name *</label>
                      <Input
                        value={newProduct.medication_name}
                        onChange={(e) => setNewProduct({ ...newProduct, medication_name: e.target.value })}
                        placeholder="e.g., Paracetamol"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Generic Name</label>
                      <Input
                        value={newProduct.generic_name || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, generic_name: e.target.value })}
                        placeholder="e.g., Acetaminophen"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Dosage *</label>
                      <Input
                        value={newProduct.dosage}
                        onChange={(e) => setNewProduct({ ...newProduct, dosage: e.target.value })}
                        placeholder="e.g., 500mg"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Price (ZMW) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Stock Quantity *</label>
                      <Input
                        type="number"
                        value={newProduct.stock_quantity}
                        onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Category *</label>
                      <Select
                        value={newProduct.category}
                        onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {medicationCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Manufacturer</label>
                      <Input
                        value={newProduct.manufacturer || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, manufacturer: e.target.value })}
                        placeholder="e.g., Pfizer"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={newProduct.description || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Product description and usage instructions"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newProduct.requires_prescription}
                        onChange={(e) => setNewProduct({ ...newProduct, requires_prescription: e.target.checked })}
                      />
                      <span className="text-sm">Requires Prescription</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newProduct.can_be_delivered}
                        onChange={(e) => setNewProduct({ ...newProduct, can_be_delivered: e.target.checked })}
                      />
                      <span className="text-sm">Can be delivered</span>
                    </label>
                  </div>
                  
                  <Button
                    onClick={() => addProductMutation.mutate(newProduct)}
                    disabled={addProductMutation.isPending || !newProduct.medication_name || !newProduct.dosage || !newProduct.category}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Delivery Zones Tab */}
            <TabsContent value="delivery">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Zones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deliveryZones && deliveryZones.length > 0 ? (
                      <div className="space-y-4">
                        {deliveryZones.map((zone) => (
                          <div key={zone.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold">{zone.zone_name}</h3>
                              <Badge variant="secondary">Active</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Delivery Fee:</span>
                                <span className="ml-2 font-medium">K{zone.delivery_fee}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Max Time:</span>
                                <span className="ml-2 font-medium">{zone.max_delivery_time} min</span>
                              </div>
                            </div>
                            {zone.restrictions && zone.restrictions.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground">Restrictions:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {zone.restrictions.map((restriction, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {restriction}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No delivery zones set up yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Add Delivery Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Zone Name *</label>
                        <Input
                          value={newZone.zone_name}
                          onChange={(e) => setNewZone({ ...newZone, zone_name: e.target.value })}
                          placeholder="e.g., Lusaka Central"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Delivery Fee (ZMW) *</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newZone.delivery_fee}
                          onChange={(e) => setNewZone({ ...newZone, delivery_fee: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Max Delivery Time (minutes) *</label>
                        <Input
                          type="number"
                          value={newZone.max_delivery_time}
                          onChange={(e) => setNewZone({ ...newZone, max_delivery_time: parseInt(e.target.value) || 60 })}
                          placeholder="60"
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => addZoneMutation.mutate(newZone)}
                      disabled={addZoneMutation.isPending || !newZone.zone_name}
                      className="w-full"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {addZoneMutation.isPending ? 'Adding...' : 'Add Delivery Zone'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Order management will be available here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </RoleProtectedRoute>
  );
};

export default PharmacyPortal;