-- =============================================
-- FIX 1: Replace all PUBLIC RLS policies with AUTHENTICATED-only
-- =============================================

-- Drop all "Anyone can..." policies on public tables
DROP POLICY IF EXISTS "Anyone can view packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can update packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can delete packages" ON public.packages;

DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can delete invoices" ON public.invoices;

DROP POLICY IF EXISTS "Anyone can view bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Anyone can insert bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Anyone can update bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Anyone can delete bank_transactions" ON public.bank_transactions;

DROP POLICY IF EXISTS "Anyone can view matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Anyone can insert matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Anyone can update matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Anyone can delete matches" ON public.invoice_transaction_matches;

DROP POLICY IF EXISTS "Anyone can view export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Anyone can insert export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Anyone can update export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Anyone can delete export_logs" ON public.export_logs;

DROP POLICY IF EXISTS "Anyone can view proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Anyone can insert proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Anyone can update proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Anyone can delete proforma_invoices" ON public.proforma_invoices;

-- Also drop the insecure token validation policy on magic links
DROP POLICY IF EXISTS "Anyone can validate magic link by token" ON public.accountant_magic_links;

-- Create authenticated-only policies for packages
CREATE POLICY "Authenticated users can view packages" ON public.packages
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert packages" ON public.packages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update packages" ON public.packages
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete packages" ON public.packages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create authenticated-only policies for invoices
CREATE POLICY "Authenticated users can view invoices" ON public.invoices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update invoices" ON public.invoices
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete invoices" ON public.invoices
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create authenticated-only policies for bank_transactions
CREATE POLICY "Authenticated users can view bank_transactions" ON public.bank_transactions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert bank_transactions" ON public.bank_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bank_transactions" ON public.bank_transactions
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bank_transactions" ON public.bank_transactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create authenticated-only policies for invoice_transaction_matches
CREATE POLICY "Authenticated users can view matches" ON public.invoice_transaction_matches
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert matches" ON public.invoice_transaction_matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update matches" ON public.invoice_transaction_matches
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete matches" ON public.invoice_transaction_matches
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create authenticated-only policies for export_logs
CREATE POLICY "Authenticated users can view export_logs" ON public.export_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert export_logs" ON public.export_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update export_logs" ON public.export_logs
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete export_logs" ON public.export_logs
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create authenticated-only policies for proforma_invoices
CREATE POLICY "Authenticated users can view proforma_invoices" ON public.proforma_invoices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert proforma_invoices" ON public.proforma_invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update proforma_invoices" ON public.proforma_invoices
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete proforma_invoices" ON public.proforma_invoices
  FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- FIX 2: Secure storage buckets - remove anonymous policies
-- =============================================

-- Drop all "Anyone can..." storage policies
DROP POLICY IF EXISTS "Anyone can upload to invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to bank-statements bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view bank-statements bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from bank-statements bucket" ON storage.objects;

-- Drop existing authenticated policies to recreate them cleanly
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read bank-statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload bank-statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update bank-statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete bank-statements" ON storage.objects;

-- Create clean authenticated-only storage policies for invoices bucket
CREATE POLICY "Auth users can read invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can upload invoices" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can update invoices" ON storage.objects
  FOR UPDATE USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can delete invoices" ON storage.objects
  FOR DELETE USING (bucket_id = 'invoices' AND auth.role() = 'authenticated');

-- Create clean authenticated-only storage policies for bank-statements bucket
CREATE POLICY "Auth users can read bank-statements" ON storage.objects
  FOR SELECT USING (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can upload bank-statements" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can update bank-statements" ON storage.objects
  FOR UPDATE USING (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');
CREATE POLICY "Auth users can delete bank-statements" ON storage.objects
  FOR DELETE USING (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');