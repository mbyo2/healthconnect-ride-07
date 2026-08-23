import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { Cart } from "@/components/marketplace/Cart";
import { CheckoutModal } from "@/components/marketplace/CheckoutModal";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Search, ShoppingCart, Package, Pill } from "lucide-react";

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
    isPlacingOrder,
  } = useMarketplace();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "cart" | "orders">("products");

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch =
      (product.medication_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.generic_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set((products || []).map((p) => p.category || "Uncategorized"))];

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handlePlaceOrder = (orderData: any) => {
    placeOrder(orderData);
    setShowCheckout(false);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f6f8] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors pb-16">
        {/* Sticky Monday Top Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-[#e6e9ef] dark:border-slate-800 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
          <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0073ea] text-white flex items-center justify-center font-black text-sm shadow-xs">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  Pharmacy Marketplace & Prescription Fulfillment
                  <span className="w-2 h-2 rounded-full bg-[#00c875] animate-ping" />
                </h1>
                <p className="text-xs text-[#676879] dark:text-slate-400 font-medium">
                  Direct procurement from licensed regional pharmacies, e-prescriptions, and courier dispatch
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("cart")}
                className="px-4 py-2 rounded-md bg-[#0073ea] hover:bg-[#0060c4] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Cart ({cart?.items?.length ?? 0})</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="max-w-[1500px] mx-auto mt-4 flex items-center gap-2">
            {[
              { id: "products", label: "Medication Catalog" },
              { id: "cart", label: `Cart Checkout (${cart?.items?.length ?? 0})` },
              { id: "orders", label: "My Orders & Dispatch" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0073ea] text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border border-[#e6e9ef] text-[#676879] hover:bg-[#f0f2f7]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
          {activeTab === "products" && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl border border-[#e6e9ef] bg-white shadow-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#676879] h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search medication name, generic compound, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#c3c6d4] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0073ea]"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-[#c3c6d4] rounded-xl text-xs font-extrabold bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-60 bg-white border border-[#e6e9ef] animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts?.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                  ))}
                </div>
              )}

              {filteredProducts?.length === 0 && !productsLoading && (
                <div className="text-center py-12 text-xs text-[#676879]">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#0073ea]" />
                  <p className="font-bold">No medications found matching your criteria.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "cart" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              <Cart
                cart={cart}
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                onCheckout={handleCheckout}
                isLoading={isPlacingOrder}
              />
            </div>
          )}

          {activeTab === "orders" && (
            <div className="rounded-2xl border border-[#e6e9ef] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
              <h2 className="font-extrabold text-sm mb-4">Medication Fulfillment & Order History</h2>
              <div className="space-y-3">
                {orders?.map((order) => (
                  <div key={order.id} className="border border-[#e6e9ef] bg-[#f5f6f8] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-xs text-slate-900">Order #{order.id.slice(0, 8)}</h3>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                          order.status === "delivered" ? "bg-[#00c875]" : order.status === "cancelled" ? "bg-[#e2445c]" : "bg-[#0073ea]"
                        }`}>
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#676879] mt-1 font-medium">
                        Total: <strong>K{order.total_amount}</strong> • {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-[11px] text-[#676879]">Delivery address: {order.delivery_address}</p>
                    </div>
                  </div>
                ))}

                {orders?.length === 0 && (
                  <div className="text-center py-10 text-xs text-[#676879]">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#0073ea]" />
                    <p className="font-bold">No active pharmacy orders yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            cart={cart}
            onPlaceOrder={handlePlaceOrder}
            isLoading={isPlacingOrder}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Marketplace;
