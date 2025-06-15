
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Cart } from '@/components/marketplace/Cart';
import { CheckoutModal } from '@/components/marketplace/CheckoutModal';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ShoppingCart, Package } from 'lucide-react';

const Marketplace = () => {
  const {
    products,
    productsLoading,
    orders,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    placeOrder,
    isPlacingOrder
  } = useMarketplace();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.generic_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(products?.map(p => p.category) || [])];

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handlePlaceOrder = (orderData: any) => {
    placeOrder(orderData);
    setShowCheckout(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-20 pb-24">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Pharmacy Marketplace</h1>
            <p className="text-muted-foreground">
              Order medications from verified pharmacies with home delivery
            </p>
          </div>

          <Tabs defaultValue="products">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products">Browse Products</TabsTrigger>
              <TabsTrigger value="cart" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.items.length})
              </TabsTrigger>
              <TabsTrigger value="orders">My Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search medications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts?.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              )}

              {filteredProducts?.length === 0 && !productsLoading && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No products found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cart">
              <Cart
                cart={cart}
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                onCheckout={handleCheckout}
                isLoading={isPlacingOrder}
              />
            </TabsContent>

            <TabsContent value="orders">
              <div className="space-y-4">
                {orders?.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                      <span className={`px-2 py-1 rounded text-sm ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total: K{order.total_amount} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm">Delivery to: {order.delivery_address}</p>
                  </div>
                ))}

                {orders?.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No orders yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            cart={cart}
            onPlaceOrder={handlePlaceOrder}
            isLoading={isPlacingOrder}
          />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Marketplace;
