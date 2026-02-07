-- ============================================
-- COMPLETE SUPABASE SETUP SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. STORAGE BUCKETS
-- ============================================

-- Create 'invoices' bucket for PDF/image invoice uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices', 
  'invoices', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create 'invoice-lists' bucket for Excel files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-lists', 
  'invoice-lists', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create 'bank-statements' bucket for bank PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bank-statements', 
  'bank-statements', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. STORAGE POLICIES (Run only if not exists)
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authorized users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload invoice lists" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can view invoice lists" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete invoice lists" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can upload bank statements" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can view bank statements" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can delete bank statements" ON storage.objects;

-- Policies for 'invoices' bucket
CREATE POLICY "Authorized users can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoices' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can view invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete invoices"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoices' AND is_authorized_user(auth.uid()));

-- Policies for 'invoice-lists' bucket
CREATE POLICY "Authorized users can upload invoice lists"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice-lists' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can view invoice lists"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice-lists' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete invoice lists"
ON storage.objects FOR DELETE
USING (bucket_id = 'invoice-lists' AND is_authorized_user(auth.uid()));

-- Policies for 'bank-statements' bucket
CREATE POLICY "Authorized users can upload bank statements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bank-statements' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can view bank statements"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-statements' AND is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete bank statements"
ON storage.objects FOR DELETE
USING (bucket_id = 'bank-statements' AND is_authorized_user(auth.uid()));

-- ============================================
-- 3. INVOICE LIST TABLES (for Excel imports)
-- ============================================

-- Invoice List Imports table for Greek invoicing software Excel files
CREATE TABLE IF NOT EXISTS invoice_list_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  period_month TEXT, -- e.g., "2026-01"
  row_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  total_net DECIMAL(15, 2) DEFAULT 0,
  total_vat DECIMAL(15, 2) DEFAULT 0,
  total_gross DECIMAL(15, 2) DEFAULT 0,
  validated_totals BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice List Items table for individual rows from Excel
CREATE TABLE IF NOT EXISTS invoice_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES invoice_list_imports(id) ON DELETE CASCADE,
  invoice_date DATE,
  invoice_number TEXT,
  mydata_code TEXT,
  client_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  client_name TEXT,
  client_vat TEXT,
  net_amount DECIMAL(15, 2),
  vat_amount DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  mydata_mark TEXT,
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('matched', 'suggested', 'unmatched')),
  matched_income_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_folder_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE invoice_list_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_list_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_list_imports
DROP POLICY IF EXISTS "Authorized users can view invoice_list_imports" ON invoice_list_imports;
DROP POLICY IF EXISTS "Authorized users can insert invoice_list_imports" ON invoice_list_imports;
DROP POLICY IF EXISTS "Authorized users can update invoice_list_imports" ON invoice_list_imports;
DROP POLICY IF EXISTS "Authorized users can delete invoice_list_imports" ON invoice_list_imports;

CREATE POLICY "Authorized users can view invoice_list_imports"
ON invoice_list_imports FOR SELECT
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert invoice_list_imports"
ON invoice_list_imports FOR INSERT
WITH CHECK (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update invoice_list_imports"
ON invoice_list_imports FOR UPDATE
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete invoice_list_imports"
ON invoice_list_imports FOR DELETE
USING (is_authorized_user(auth.uid()));

-- RLS policies for invoice_list_items
DROP POLICY IF EXISTS "Authorized users can view invoice_list_items" ON invoice_list_items;
DROP POLICY IF EXISTS "Authorized users can insert invoice_list_items" ON invoice_list_items;
DROP POLICY IF EXISTS "Authorized users can update invoice_list_items" ON invoice_list_items;
DROP POLICY IF EXISTS "Authorized users can delete invoice_list_items" ON invoice_list_items;

CREATE POLICY "Authorized users can view invoice_list_items"
ON invoice_list_items FOR SELECT
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert invoice_list_items"
ON invoice_list_items FOR INSERT
WITH CHECK (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update invoice_list_items"
ON invoice_list_items FOR UPDATE
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete invoice_list_items"
ON invoice_list_items FOR DELETE
USING (is_authorized_user(auth.uid()));

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoice_list_items_import ON invoice_list_items(import_id);
CREATE INDEX IF NOT EXISTS idx_invoice_list_items_client ON invoice_list_items(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_list_items_status ON invoice_list_items(match_status);
CREATE INDEX IF NOT EXISTS idx_invoice_list_items_date ON invoice_list_items(invoice_date);
CREATE INDEX IF NOT EXISTS idx_customers_vat ON customers(vat_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_vat ON suppliers(vat_number);

-- ============================================
-- 5. ADDITIONAL COLUMNS (if missing)
-- ============================================

-- Add VAT number field and IBAN to suppliers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'vat_number') THEN
    ALTER TABLE suppliers ADD COLUMN vat_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'tax_office') THEN
    ALTER TABLE suppliers ADD COLUMN tax_office TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'iban') THEN
    ALTER TABLE suppliers ADD COLUMN iban TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'default_category_id') THEN
    ALTER TABLE suppliers ADD COLUMN default_category_id UUID REFERENCES expense_categories(id);
  END IF;
END $$;

-- Add tax_office field to customers (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tax_office') THEN
    ALTER TABLE customers ADD COLUMN tax_office TEXT;
  END IF;
END $$;

-- ============================================
-- DONE! All storage buckets and tables created.
-- ============================================
