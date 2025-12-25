-- Create lab_test_catalog table
CREATE TABLE IF NOT EXISTS public.lab_test_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create symptom_categories table
CREATE TABLE IF NOT EXISTS public.symptom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create emergency_services table
CREATE TABLE IF NOT EXISTS public.emergency_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('ambulance', 'hospital', 'pharmacy', 'police', 'fire')),
    available24h BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_services ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies (Allow all authenticated users to read)
CREATE POLICY "Allow authenticated users to view lab tests" ON public.lab_test_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to view symptom categories" ON public.symptom_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to view emergency services" ON public.emergency_services FOR SELECT TO authenticated USING (true);

-- Seed lab_test_catalog
INSERT INTO public.lab_test_catalog (name, category, price, description) VALUES
('Full Blood Count', 'Hematology', 150.00, 'Complete blood count analysis'),
('Lipid Profile', 'Biochemistry', 250.00, 'Cholesterol and triglycerides test'),
('Blood Glucose', 'Biochemistry', 50.00, 'Fast blood sugar test'),
('Malaria Parasites', 'Microbiology', 80.00, 'Test for malaria parasites'),
('Urinalysis', 'Clinical Chemistry', 70.00, 'Complete urine analysis'),
('HIV Screening', 'Serology', 0.00, 'Confidential HIV screening');

-- Seed symptom_categories
INSERT INTO public.symptom_categories (name, description) VALUES
('General', 'Common symptoms like fever, fatigue, or pain'),
('Respiratory', 'Symptoms related to breathing, cough, or chest'),
('Digestive', 'Symptoms related to stomach, digestion, or appetite'),
('Neurological', 'Symptoms like headaches, dizziness, or numbness'),
('Skin', 'Symptoms related to rashes, itching, or lesions'),
('Mental Health', 'Symptoms related to mood, anxiety, or sleep');

-- Seed emergency_services
INSERT INTO public.emergency_services (name, phone, description, type, available24h) VALUES
('Ambulance Service Zambia', '911', 'Emergency ambulance and medical response', 'ambulance', true),
('University Teaching Hospital', '+260-211-256067', 'Main emergency hospital in Lusaka', 'hospital', true),
('Zambia Police', '999', 'Police emergency services', 'police', true),
('Fire Department', '993', 'Fire and rescue services', 'fire', true),
('Road Traffic Accidents', '991', 'Emergency response for road accidents', 'ambulance', true);
