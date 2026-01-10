-- Drop existing restrictive policies and create permissive ones for development
-- Note: These should be tightened when auth is implemented

-- Packages table
DROP POLICY IF EXISTS "Authenticated users can view packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can insert packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can update packages" ON public.packages;
DROP POLICY IF EXISTS "Authenticated users can delete packages" ON public.packages;

CREATE POLICY "Anyone can view packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert packages" ON public.packages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update packages" ON public.packages FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete packages" ON public.packages FOR DELETE USING (true);

-- Invoices table
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update invoices" ON public.invoices FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete invoices" ON public.invoices FOR DELETE USING (true);

-- Bank transactions table
DROP POLICY IF EXISTS "Authenticated users can view bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can update bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete bank_transactions" ON public.bank_transactions;

CREATE POLICY "Anyone can view bank_transactions" ON public.bank_transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert bank_transactions" ON public.bank_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bank_transactions" ON public.bank_transactions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bank_transactions" ON public.bank_transactions FOR DELETE USING (true);

-- Invoice transaction matches table
DROP POLICY IF EXISTS "Authenticated users can view matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON public.invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON public.invoice_transaction_matches;

CREATE POLICY "Anyone can view matches" ON public.invoice_transaction_matches FOR SELECT USING (true);
CREATE POLICY "Anyone can insert matches" ON public.invoice_transaction_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update matches" ON public.invoice_transaction_matches FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete matches" ON public.invoice_transaction_matches FOR DELETE USING (true);

-- Export logs table
DROP POLICY IF EXISTS "Authenticated users can view export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Authenticated users can insert export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Authenticated users can update export_logs" ON public.export_logs;
DROP POLICY IF EXISTS "Authenticated users can delete export_logs" ON public.export_logs;

CREATE POLICY "Anyone can view export_logs" ON public.export_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert export_logs" ON public.export_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update export_logs" ON public.export_logs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete export_logs" ON public.export_logs FOR DELETE USING (true);

-- Storage policies for invoices bucket
DROP POLICY IF EXISTS "Authenticated users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON storage.objects;

CREATE POLICY "Anyone can upload to invoices bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Anyone can view invoices bucket" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');
CREATE POLICY "Anyone can delete from invoices bucket" ON storage.objects FOR DELETE USING (bucket_id = 'invoices');

-- Storage policies for bank-statements bucket  
DROP POLICY IF EXISTS "Authenticated users can upload bank statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view bank statements" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete bank statements" ON storage.objects;

CREATE POLICY "Anyone can upload to bank-statements bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bank-statements');
CREATE POLICY "Anyone can view bank-statements bucket" ON storage.objects FOR SELECT USING (bucket_id = 'bank-statements');
CREATE POLICY "Anyone can delete from bank-statements bucket" ON storage.objects FOR DELETE USING (bucket_id = 'bank-statements');