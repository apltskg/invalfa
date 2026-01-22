-- COMPLETE DATABASE SETUP ensure all features work
-- Run this in Supabase SQL Editor

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create ENUMs (if they don't exist)
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_category AS ENUM ('airline', 'hotel', 'tolls', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE package_status AS ENUM ('active', 'completed', 'quote', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create TABLES

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    invoice_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    vat_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agency Settings (for Settings page future-proofing)
CREATE TABLE IF NOT EXISTS public.agency_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT,
    vat_number TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    iban TEXT,
    swift TEXT,
    bank_name TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Proforma Invoices
CREATE TABLE IF NOT EXISTS public.proforma_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_name TEXT,
    client_address TEXT,
    client_email TEXT,
    client_vat_number TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 13,
    tax_amount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    notes TEXT,
    accept_cash BOOLEAN DEFAULT false,
    accept_bank_transfer BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Accountant Magic Links
CREATE TABLE IF NOT EXISTS public.accountant_magic_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    month_year TEXT NOT NULL, -- Format: '2024-05'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accessed_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Export Logs
CREATE TABLE IF NOT EXISTS public.export_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,
    invoices_included INTEGER DEFAULT 0,
    packages_included INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role app_role DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS (Security)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Simple: allow authenticated users to do everything)
DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.suppliers FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.customers FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.agency_settings FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.proforma_invoices FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.accountant_magic_links FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all access for authenticated users" ON public.export_logs FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. Grant Permissions
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.agency_settings TO authenticated;
GRANT ALL ON public.proforma_invoices TO authenticated;
GRANT ALL ON public.accountant_magic_links TO authenticated;
GRANT ALL ON public.export_logs TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- 7. Add columns to Packages if not exists
ALTER TABLE public.packages 
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS status package_status DEFAULT 'active';

-- 8. Add columns to Invoices if not exists
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

