-- Management Systems Migration
-- PMS, HMS, and LMS Tables
-- Version: 002

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pharmacy Suppliers (must come first due to foreign key)
CREATE TABLE IF NOT EXISTS pharmacy_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Prescriptions (must come before inventory due to FK)
CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_number TEXT UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES profiles(id),
    pharmacy_id UUID REFERENCES healthcare_institutions(id),
    medications JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'expired')),
    filled_by UUID REFERENCES profiles(id),
    filled_at TIMESTAMP WITH TIME ZONE,
    valid_until DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Inventory
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('medication', 'equipment', 'supplement', 'medical_supply', 'personal_care')),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    supplier_id UUID REFERENCES pharmacy_suppliers(id),
    expiry_date DATE,
    reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    batch_number TEXT,
    barcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Sales (POS)
CREATE TABLE IF NOT EXISTS pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    transaction_id TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id),
    items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile_money', 'insurance', 'credit')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    prescription_id UUID REFERENCES pharmacy_prescriptions(id),
    served_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hospital Departments
CREATE TABLE IF NOT EXISTS hospital_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    head_id UUID REFERENCES profiles(id),
    bed_capacity INTEGER NOT NULL DEFAULT 0 CHECK (bed_capacity >= 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, code)
);

-- Hospital Beds
CREATE TABLE IF NOT EXISTS hospital_beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES hospital_departments(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    bed_type TEXT NOT NULL CHECK (bed_type IN ('general', 'icu', 'private', 'semi_private', 'maternity', 'pediatric')),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    current_patient_id UUID REFERENCES profiles(id),
    floor_number INTEGER,
    room_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, bed_number)
);

-- Hospital Admissions
CREATE TABLE IF NOT EXISTS hospital_admissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admission_number TEXT UNIQUE NOT NULL,
    department_id UUID NOT NULL REFERENCES hospital_departments(id),
    bed_id UUID REFERENCES hospital_beds(id),
    admitting_doctor_id UUID NOT NULL REFERENCES profiles(id),
    admission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharge_date TIMESTAMP WITH TIME ZONE,
    admission_type TEXT NOT NULL CHECK (admission_type IN ('emergency', 'scheduled', 'transfer')),
    diagnosis TEXT,
    treatment_plan TEXT,
    status TEXT DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged', 'transferred', 'deceased')),
    discharge_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hospital Billing
CREATE TABLE IF NOT EXISTS hospital_billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES hospital_admissions(id),
    invoice_number TEXT UNIQUE NOT NULL,
    items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    balance DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    due_date DATE,
    insurance_claim_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lab Tests
CREATE TABLE IF NOT EXISTS lab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID NOT NULL REFERENCES healthcare_institutions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    admission_id UUID REFERENCES hospital_admissions(id),
    test_number TEXT UNIQUE NOT NULL,
    test_type TEXT NOT NULL,
    test_category TEXT,
    ordered_by UUID NOT NULL REFERENCES profiles(id),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('routine', 'normal', 'urgent', 'emergency')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'completed', 'cancelled')),
    sample_type TEXT,
    sample_collected_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    result_summary TEXT,
    results_date TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Pharmacy
CREATE POLICY "pharmacy_inventory_select" ON pharmacy_inventory FOR SELECT
USING (pharmacy_id IN (SELECT id FROM healthcare_institutions WHERE admin_id = auth.uid()));

CREATE POLICY "pharmacy_sales_select" ON pharmacy_sales FOR SELECT
USING (pharmacy_id IN (SELECT id FROM healthcare_institutions WHERE admin_id = auth.uid()));

CREATE POLICY "pharmacy_prescriptions_patient_select" ON pharmacy_prescriptions FOR SELECT
USING (patient_id = auth.uid());

CREATE POLICY "pharmacy_prescriptions_doctor_all" ON pharmacy_prescriptions FOR ALL
USING (doctor_id = auth.uid());

-- RLS Policies for Hospital
CREATE POLICY "hospital_admissions_patient_select" ON hospital_admissions FOR SELECT
USING (patient_id = auth.uid());

CREATE POLICY "hospital_billing_patient_select" ON hospital_billing FOR SELECT
USING (patient_id = auth.uid());

CREATE POLICY "lab_tests_patient_select" ON lab_tests FOR SELECT
USING (patient_id = auth.uid());

-- Indexes for Performance
CREATE INDEX idx_pharmacy_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX idx_pharmacy_sales_pharmacy ON pharmacy_sales(pharmacy_id);
CREATE INDEX idx_pharmacy_prescriptions_patient ON pharmacy_prescriptions(patient_id);
CREATE INDEX idx_hospital_admissions_hospital ON hospital_admissions(hospital_id);
CREATE INDEX idx_hospital_admissions_patient ON hospital_admissions(patient_id);
CREATE INDEX idx_hospital_billing_patient ON hospital_billing(patient_id);
CREATE INDEX idx_lab_tests_patient ON lab_tests(patient_id);
