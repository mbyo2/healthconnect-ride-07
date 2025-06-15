
-- Create marketplace products table
CREATE TABLE public.marketplace_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pharmacy_id UUID REFERENCES healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  manufacturer TEXT,
  category TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pharmacy_id UUID REFERENCES healthcare_institutions(id) ON DELETE SET NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled')),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  delivery_address TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  delivery_instructions TEXT,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES marketplace_products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Create delivery tracking table
CREATE TABLE public.delivery_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered')),
  pickup_time TIMESTAMP WITH TIME ZONE,
  delivery_time TIMESTAMP WITH TIME ZONE,
  tracking_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW())
);

-- Create location updates table for tracking
CREATE TABLE public.location_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES delivery_tracking(id) ON DELETE CASCADE NOT NULL,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(11,8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()),
  notes TEXT
);

-- Enable RLS on marketplace tables
ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for marketplace_products (public read, pharmacy write)
CREATE POLICY "Anyone can view active products"
  ON public.marketplace_products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Pharmacies can manage their products"
  ON public.marketplace_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM healthcare_institutions hi
      WHERE hi.id = pharmacy_id 
      AND hi.admin_id = auth.uid()
    )
  );

-- RLS policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid() = patient_id OR
    EXISTS (
      SELECT 1 FROM healthcare_institutions hi
      WHERE hi.id = pharmacy_id 
      AND hi.admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Pharmacies can update orders"
  ON public.orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM healthcare_institutions hi
      WHERE hi.id = pharmacy_id 
      AND hi.admin_id = auth.uid()
    )
  );

-- RLS policies for order_items
CREATE POLICY "Users can view order items for their orders"
  ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id 
      AND (
        o.patient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM healthcare_institutions hi
          WHERE hi.id = o.pharmacy_id 
          AND hi.admin_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "System can manage order items"
  ON public.order_items
  FOR ALL
  USING (true);

-- RLS policies for delivery tracking
CREATE POLICY "Users can view delivery tracking for their orders"
  ON public.delivery_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id 
      AND (
        o.patient_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM healthcare_institutions hi
          WHERE hi.id = o.pharmacy_id 
          AND hi.admin_id = auth.uid()
        )
      )
    )
  );

-- Add updated_at triggers
CREATE TRIGGER handle_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_delivery_tracking_updated_at
  BEFORE UPDATE ON public.delivery_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
