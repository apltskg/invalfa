-- TravelDocs Schema Migration
-- Run this SQL in your Supabase SQL Editor to update the database schema

-- 1. Create Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Update Packages Table
ALTER TABLE public.packages 
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_margin_percent NUMERIC(5,2) DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('quote', 'active', 'completed', 'cancelled')),
    ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Update Invoices Table
-- Add new invoice type enum
DO $$ BEGIN
    CREATE TYPE invoice_type AS ENUM ('expense', 'income');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS type invoice_type DEFAULT 'expense',
    ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 5. Update Bank Transactions Table
ALTER TABLE public.bank_transactions
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'ignored'));

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies (adjust based on your auth setup)
-- For now, allowing authenticated users full access
CREATE POLICY "Enable all access for authenticated users" ON public.suppliers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.customers
    FOR ALL USING (auth.role() = 'authenticated');

-- 8. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON public.packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON public.invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON public.invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON public.bank_transactions(status);

-- 9. Update modified timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to new tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. Grant permissions (adjust based on your roles)
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.customers TO authenticated;

-- Migration Complete!
-- Note: After running this migration, you may need to regenerate your Supabase types
-- Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
