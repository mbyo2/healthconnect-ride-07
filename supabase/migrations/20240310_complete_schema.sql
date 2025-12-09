-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Roles & Profiles (Enhancement)
-- Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

-- 2. IoT Integration
CREATE TABLE IF NOT EXISTS public.iot_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    battery_level INTEGER,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vital_signs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.iot_devices(id) ON DELETE SET NULL,
    heart_rate INTEGER,
    blood_pressure JSONB,
    temperature DECIMAL(4,1),
    oxygen_saturation DECIMAL(4,1),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.device_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID REFERENCES public.iot_devices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_acknowledged BOOLEAN DEFAULT false
);

-- 3. Lab Management
CREATE TABLE IF NOT EXISTS public.lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    turnaround_time_hours INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    test_id UUID REFERENCES public.lab_tests(id),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
    priority TEXT CHECK (priority IN ('routine', 'urgent', 'stat')) DEFAULT 'routine',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES public.lab_requests(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.lab_tests(id),
    patient_id UUID REFERENCES auth.users(id),
    technician_id UUID REFERENCES auth.users(id),
    result_value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    comments TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Healthcare Institutions (Pharmacy & Hospital Base)
CREATE TABLE IF NOT EXISTS public.healthcare_institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('pharmacy', 'hospital', 'clinic', 'lab')),
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Pharmacy Management
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_code TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL,
    expiry_date DATE,
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    transaction_id TEXT UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    items JSONB NOT NULL, -- Store snapshot of items sold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Hospital Management
CREATE TABLE IF NOT EXISTS public.hospital_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    bed_capacity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hospital_beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.hospital_departments(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('available', 'occupied', 'maintenance')) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.hospital_admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES auth.users(id),
    department_id UUID REFERENCES public.hospital_departments(id),
    bed_id UUID REFERENCES public.hospital_beds(id),
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    discharge_date TIMESTAMP WITH TIME ZONE,
    diagnosis TEXT,
    status TEXT CHECK (status IN ('admitted', 'discharged', 'transferred')) DEFAULT 'admitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healthcare_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_admissions ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Open for demo, restrict in production)
-- Allow read access to authenticated users for most tables
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.lab_tests;
CREATE POLICY "Allow read access for authenticated users" ON public.lab_tests FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.healthcare_institutions;
CREATE POLICY "Allow read access for authenticated users" ON public.healthcare_institutions FOR SELECT TO authenticated USING (true);

-- User specific policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own devices" ON public.iot_devices;
CREATE POLICY "Users can view their own devices" ON public.iot_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own vital signs" ON public.vital_signs;
CREATE POLICY "Users can view their own vital signs" ON public.vital_signs FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own lab requests" ON public.lab_requests;
CREATE POLICY "Users can view their own lab requests" ON public.lab_requests FOR SELECT TO authenticated USING (auth.uid() = patient_id OR auth.uid() = provider_id);

-- Admin/Staff policies (Simplified for setup)
-- In a real app, you'd check user_roles table for 'admin', 'lab', etc.
-- For now, we'll allow authenticated users to insert/update if they have the right context (handled by app logic)

-- 7. Hospital Billing (Added for completeness)
CREATE TABLE IF NOT EXISTS public.hospital_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES auth.users(id),
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('Paid', 'Pending', 'Overdue')) DEFAULT 'Pending',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.hospital_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.hospital_invoices;
CREATE POLICY "Allow read access for authenticated users" ON public.hospital_invoices FOR SELECT TO authenticated USING (true);

