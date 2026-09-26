
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MarketplaceProduct, Order, Cart, CartItem } from '@/types/marketplace';
import { toast } from 'sonner';
import { safeLocalGet, safeLocalSet, safeLocalRemove } from '@/utils/storage';

export const useMarketplace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });

  // Load persisted cart from localStorage (resilient to blocked storage)
  useEffect(() => {
    try {
      const raw = safeLocalGet('hc_cart_v1');
      if (raw) {
        const cleanRaw = raw.trim().replace(/^\uFEFF/, '');
        const parsed = JSON.parse(cleanRaw) as Cart;
        // Basic shape check
        if (parsed && Array.isArray(parsed.items)) {
          setCart(parsed);
        }
      }
    } catch (err) {
      // Ignore parse errors or storage issues
      console.warn('Failed to load persisted cart:', err);
    }
  }, []);

  // Get all marketplace products
  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: async () => {
      // Only surface products from pharmacies that were approved AND opted into public listing
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(`
          *,
          pharmacy:healthcare_institutions!marketplace_products_pharmacy_id_fkey!inner(
            id, name, address, phone, email, is_verified, list_in_marketplace
          )
        `)
        .eq('is_active', true)
        .eq('pharmacy.is_verified', true)
        .eq('pharmacy.list_in_marketplace', true)
        .order('medication_name');

      if (error) throw error;
      return data as MarketplaceProduct[];
    }
  });

  // Get user's orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*,
            product:marketplace_products(*)
          ),
          prescription:comprehensive_prescriptions(
            id, medication_name, dosage, provider_id
          )
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map comprehensive prescription data to match expected Order interface if needed
      // For now returning as is, assuming Order type will be updated or is compatible
      return data as any as Order[];
    },
    enabled: !!user
  });

  // Add to cart — one pharmacy per checkout: block mixing pharmacies so an
  // order's single pharmacy_id always matches every item.
  const addToCart = (product: MarketplaceProduct, quantity: number = 1) => {
    const cartPharmacyId = cart.items[0]?.product?.pharmacy_id;
    if (cartPharmacyId && product.pharmacy_id && cartPharmacyId !== product.pharmacy_id) {
      toast.error('Your cart already has items from another pharmacy — check out first, then add this item.');
      return;
    }
    setCart(prev => {
      const existingItemIndex = prev.items.findIndex(item => item.product.id === product.id);
      let newItems = [...prev.items];

      if (existingItemIndex >= 0) {
        newItems[existingItemIndex].quantity += quantity;
        newItems[existingItemIndex].subtotal = newItems[existingItemIndex].quantity * product.price;
      } else {
        newItems.push({
          product,
          quantity,
          subtotal: quantity * product.price
        });
      }

      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newCart = { items: newItems, total };
      try { safeLocalSet('hc_cart_v1', JSON.stringify(newCart)); } catch (e) { /* ignore */ }
      return newCart;
    });

    toast.success(`${product.medication_name} added to cart`);
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(item => item.product.id !== productId);
      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newCart = { items: newItems, total };
      try { safeLocalSet('hc_cart_v1', JSON.stringify(newCart)); } catch (e) { /* ignore */ }
      return newCart;
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => {
      const newItems = prev.items.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            quantity,
            subtotal: quantity * item.product.price
          };
        }
        return item;
      });

      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newCart = { items: newItems, total };
      try { safeLocalSet('hc_cart_v1', JSON.stringify(newCart)); } catch (e) { /* ignore */ }
      return newCart;
    });
  };

  // Clear cart
  const clearCart = () => {
    setCart({ items: [], total: 0 });
    try { safeLocalRemove('hc_cart_v1'); } catch (e) { /* ignore */ }
  };

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: {
      pharmacy_id: string;
      delivery_address: string;
      delivery_phone: string;
      delivery_instructions?: string;
      prescription_id?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (cart.items.length === 0) throw new Error('Cart is empty');

      // Defense in depth: every item must belong to the chosen pharmacy.
      const mismatched = cart.items.find(
        (item) => item.product.pharmacy_id && item.product.pharmacy_id !== orderData.pharmacy_id
      );
      if (mismatched) {
        throw new Error('Your cart contains items from more than one pharmacy — please check out separately.');
      }

      // Check if any items require prescription
      const requiresPrescription = cart.items.some(item => item.product.requires_prescription);
      if (requiresPrescription && !orderData.prescription_id) {
        throw new Error('Prescription required for one or more items');
      }

      // Create order — prices/totals are enforced server-side by triggers
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          patient_id: user.id,
          pharmacy_id: orderData.pharmacy_id,
          total_amount: 0,
          status: 'pending',
          prescription_id: orderData.prescription_id,
          delivery_address: orderData.delivery_address,
          delivery_phone: orderData.delivery_phone,
          delivery_instructions: orderData.delivery_instructions
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items — unit_price/total_price are overwritten by the
      // server-side price integrity triggers, never trusted from the client
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: 0,
        total_price: 0
      }));


      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Compensating rollback: never leave an empty pending order behind.
        await supabase.from('orders').delete().eq('id', order.id);
        throw itemsError;
      }

      // Re-read the order: server triggers recalculate total_amount on the
      // order_items insert, so the freshly returned row has the real total
      // the payment step needs.
      const { data: freshOrder } = await supabase
        .from('orders')
        .select()
        .eq('id', order.id)
        .single();

      return (freshOrder as any) || order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      clearCart();
      toast.success('Order created — complete your payment to confirm it.');
    },
    onError: (error: any) => {
      toast.error('Failed to place order: ' + error.message);
    }
  });

  return {
    products,
    productsLoading,
    productsError,
    refetchProducts,
    orders,
    ordersLoading,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    placeOrder: placeOrderMutation.mutate,
    isPlacingOrder: placeOrderMutation.isPending
  };
};
