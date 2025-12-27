export interface MarketplaceProduct {
  id: string;
  pharmacy_id: string;
  medication_name: string;
  generic_name?: string;
  dosage: string;
  price: number;
  stock_quantity: number;
  requires_prescription: boolean;
  description?: string;
  manufacturer?: string;
  category: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  pharmacy?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export interface Order {
  id: string;
  patient_id: string;
  pharmacy_id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered' | 'cancelled';
  prescription_id?: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  prescription?: {
    id: string;
    medication_name: string;
    dosage: string;
    prescribed_by: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: MarketplaceProduct;
}

export interface DeliveryTracking {
  id: string;
  order_id: string;
  driver_id?: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  pickup_time?: string;
  delivery_time?: string;
  tracking_notes?: string;
  location_updates: LocationUpdate[];
}

export interface LocationUpdate {
  id: string;
  delivery_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  notes?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
  subtotal: number;
}

// Marketplace status transitions implemented in src/utils/marketplace-workflows.ts
// Use confirmOrder(), startPreparation(), markReady(), markDelivered(), and cancelOrder()
