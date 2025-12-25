-- Add "Emergency dental care" to emergency_services
INSERT INTO public.emergency_services (name, phone, description, type, available24h) VALUES
('Emergency Dental Care', '+260-977-123456', 'Urgent dental and oral surgery services', 'hospital', true);

-- Add missing specialties to symptom_categories
INSERT INTO public.symptom_categories (name, description) VALUES
('Heart Health', 'Symptoms related to heart, pulse, or blood pressure'),
('Pediatrics', 'Symptoms related to children and infants'),
('Orthopedics', 'Symptoms related to bones, joints, and muscles');

-- Create specialized_care_categories table
CREATE TABLE IF NOT EXISTS public.specialized_care_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    color_class TEXT NOT NULL,
    route TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialized_care_categories ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy
CREATE POLICY "Allow authenticated users to view specialized care" ON public.specialized_care_categories FOR SELECT TO authenticated USING (true);

-- Seed specialized_care_categories
INSERT INTO public.specialized_care_categories (id, name, icon_name, color_class, route, display_order) VALUES
('dental', 'Dental Health', 'Smile', 'bg-cyan-50', '/search?category=dental', 1),
('skin', 'Skin & Hair', 'Zap', 'bg-orange-50', '/search?category=skin', 2),
('heart', 'Heart Health', 'Heart', 'bg-red-50', '/search?category=heart', 3),
('mental', 'Mental Health', 'Brain', 'bg-purple-50', '/search?category=mental', 4),
('pediatrics', 'Pediatrics', 'Baby', 'bg-blue-50', '/search?category=pediatrics', 5),
('ortho', 'Orthopedics', 'Bone', 'bg-amber-50', '/search?category=ortho', 6),
('neuro', 'Neurology', 'Activity', 'bg-indigo-50', '/search?category=neuro', 7),
('emergency', 'Emergency', 'ShieldAlert', 'bg-rose-50', '/emergency', 8);
