
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MarketplaceProduct, Order, Cart, CartItem } from '@/types/marketplace';
import { toast } from 'sonner';

export const useMarketplace = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });

  // Get all marketplace products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['marketplace-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(`
          *,
          pharmacy:healthcare_institutions!marketplace_products_pharmacy_id_fkey(
            id, name, address, phone, email
          )
        `)
        .eq('is_active', true)
        .order('medication_name');

      if (error) throw error;
      return data as MarketplaceProduct[];
    }
  });

  // Get user's orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
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
          prescription:prescriptions(
            id, medication_name, dosage, prescribed_by
          )
        `)
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user
  });

  // Add to cart
  const addToCart = (product: MarketplaceProduct, quantity: number = 1) => {
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
      return { items: newItems, total };
    });

    toast.success(`${product.medication_name} added to cart`);
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newItems = prev.items.filter(item => item.product.id !== productId);
      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      return { items: newItems, total };
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
      return { items: newItems, total };
    });
  };

  // Clear cart
  const clearCart = () => {
    setCart({ items: [], total: 0 });
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

      // Check if any items require prescription
      const requiresPrescription = cart.items.some(item => item.product.requires_prescription);
      if (requiresPrescription && !orderData.prescription_id) {
        throw new Error('Prescription required for one or more items');
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          patient_id: user.id,
          pharmacy_id: orderData.pharmacy_id,
          total_amount: cart.total,
          status: 'pending',
          prescription_id: orderData.prescription_id,
          delivery_address: orderData.delivery_address,
          delivery_phone: orderData.delivery_phone,
          delivery_instructions: orderData.delivery_instructions
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.subtotal
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      clearCart();
      toast.success('Order placed successfully!');
    },
    onError: (error: any) => {
      toast.error('Failed to place order: ' + error.message);
    }
  });

  return {
    products,
    productsLoading,
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
