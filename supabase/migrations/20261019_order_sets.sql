-- Order sets (Epic parity)
-- Predefined clinical order templates for common conditions
-- Date: 2026-10-19

-- Order set templates
CREATE TABLE IF NOT EXISTS public.order_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'admission', 'pneumonia', 'diabetes', 'post-op'
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT FALSE, -- system-wide templates vs institution-specific
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Individual orders within a set
CREATE TABLE IF NOT EXISTS public.order_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_set_id UUID NOT NULL REFERENCES public.order_sets(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'lab', 'imaging', 'medication', 'procedure', 'nursing', 'diet', 'consult'
  item_name TEXT NOT NULL,
  details JSONB DEFAULT '{}', -- dose, frequency, instructions, etc.
  display_order INTEGER DEFAULT 0,
  is_optional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.order_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_set_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view system order sets and their institution's sets
CREATE POLICY "View order sets"
  ON public.order_sets FOR SELECT
  USING (
    is_system = TRUE 
    OR institution_id IN (
      SELECT institution_id FROM public.institution_staff 
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "View order set items"
  ON public.order_set_items FOR SELECT
  USING (
    order_set_id IN (
      SELECT id FROM public.order_sets 
      WHERE is_system = TRUE 
      OR institution_id IN (
        SELECT institution_id FROM public.institution_staff 
        WHERE provider_id = auth.uid() AND is_active = TRUE
      )
    )
  );

-- Clinicians can create institution order sets
CREATE POLICY "Clinicians manage institution order sets"
  ON public.order_sets FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff 
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff 
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Manage order set items"
  ON public.order_set_items FOR ALL
  USING (
    order_set_id IN (
      SELECT id FROM public.order_sets 
      WHERE institution_id IN (
        SELECT institution_id FROM public.institution_staff 
        WHERE provider_id = auth.uid() AND is_active = TRUE
      )
    )
  )
  WITH CHECK (
    order_set_id IN (
      SELECT id FROM public.order_sets 
      WHERE institution_id IN (
        SELECT institution_id FROM public.institution_staff 
        WHERE provider_id = auth.uid() AND is_active = TRUE
      )
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_sets_institution ON public.order_sets(institution_id);
CREATE INDEX IF NOT EXISTS idx_order_sets_category ON public.order_sets(category);
CREATE INDEX IF NOT EXISTS idx_order_set_items_set ON public.order_set_items(order_set_id);

-- Seed system order sets
INSERT INTO public.order_sets (name, description, category, is_system, is_active) VALUES
('Pneumonia Admission', 'Standard admission orders for community-acquired pneumonia', 'admission', TRUE, TRUE),
('Diabetes Management', 'Routine diabetes care orders', 'chronic', TRUE, TRUE),
('Post-Operative', 'Standard post-surgical orders', 'post-op', TRUE, TRUE),
('Sepsis Workup', 'Emergency sepsis evaluation orders', 'emergency', TRUE, TRUE)
ON CONFLICT DO NOTHING;
