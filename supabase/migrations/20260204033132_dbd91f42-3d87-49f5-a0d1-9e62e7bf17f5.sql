-- =============================================
-- PHASE 1: Enhanced Database Schema for Multi-Bank & Categories
-- =============================================

-- 1. Add more columns to expense_categories table for full CRUD
ALTER TABLE public.expense_categories 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 2. Create banks reference table
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_el TEXT NOT NULL,
  brand_color TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 4 Greek banks
INSERT INTO public.banks (name, name_el, brand_color) VALUES
  ('eurobank', 'Eurobank', '#8B1538'),
  ('alpha', 'Alpha Bank', '#00529B'),
  ('viva', 'Viva Wallet', '#00A650'),
  ('wise', 'Wise', '#37517E')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on banks
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Banks are read-only for all authenticated users
CREATE POLICY "Authenticated users can view banks" 
ON public.banks FOR SELECT 
USING (is_authorized_user(auth.uid()));

-- 3. Create bank_statements table to track uploaded PDFs
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id UUID REFERENCES public.banks(id),
  bank_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  statement_month TEXT, -- Format: YYYY-MM
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on bank_statements
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view bank_statements" 
ON public.bank_statements FOR SELECT 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert bank_statements" 
ON public.bank_statements FOR INSERT 
WITH CHECK (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update bank_statements" 
ON public.bank_statements FOR UPDATE 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete bank_statements" 
ON public.bank_statements FOR DELETE 
USING (is_authorized_user(auth.uid()));

-- 4. Add new columns to bank_transactions for multi-bank support
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id),
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS statement_id UUID REFERENCES public.bank_statements(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'unmatched',
ADD COLUMN IF NOT EXISTS matched_record_id UUID,
ADD COLUMN IF NOT EXISTS matched_record_type TEXT, -- 'invoice', 'income', 'expense'
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'unmatched', -- 'folder', 'general_income', 'general_expense', 'unmatched'
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2);

-- 5. Create excel_imports table for invoice list imports
CREATE TABLE IF NOT EXISTS public.excel_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  row_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  mapped_columns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on excel_imports
ALTER TABLE public.excel_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view excel_imports" 
ON public.excel_imports FOR SELECT 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert excel_imports" 
ON public.excel_imports FOR INSERT 
WITH CHECK (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update excel_imports" 
ON public.excel_imports FOR UPDATE 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete excel_imports" 
ON public.excel_imports FOR DELETE 
USING (is_authorized_user(auth.uid()));

-- 6. Create excel_invoice_rows table
CREATE TABLE IF NOT EXISTS public.excel_invoice_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.excel_imports(id) ON DELETE CASCADE,
  invoice_number TEXT,
  invoice_date DATE,
  client_name TEXT,
  net_amount NUMERIC(12,2),
  vat_amount NUMERIC(12,2),
  total_amount NUMERIC(12,2),
  match_status TEXT DEFAULT 'unmatched',
  matched_income_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on excel_invoice_rows
ALTER TABLE public.excel_invoice_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view excel_invoice_rows" 
ON public.excel_invoice_rows FOR SELECT 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert excel_invoice_rows" 
ON public.excel_invoice_rows FOR INSERT 
WITH CHECK (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update excel_invoice_rows" 
ON public.excel_invoice_rows FOR UPDATE 
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can delete excel_invoice_rows" 
ON public.excel_invoice_rows FOR DELETE 
USING (is_authorized_user(auth.uid()));

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_id ON public.bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status ON public.bank_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement_id ON public.bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_bank_id ON public.bank_statements(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_month ON public.bank_statements(statement_month);
CREATE INDEX IF NOT EXISTS idx_excel_invoice_rows_import ON public.excel_invoice_rows(import_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_sort ON public.expense_categories(sort_order);