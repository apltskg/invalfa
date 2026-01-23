-- Enforce role-based access on all critical tables
-- Replace auth.role() = 'authenticated' with is_authorized_user(auth.uid())

-- =====================================================
-- PACKAGES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can insert packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can update packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can delete packages" ON packages;

CREATE POLICY "Authorized users can view packages" ON packages
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert packages" ON packages
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update packages" ON packages
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete packages" ON packages
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- INVOICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

CREATE POLICY "Authorized users can view invoices" ON invoices
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert invoices" ON invoices
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update invoices" ON invoices
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete invoices" ON invoices
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- BANK_TRANSACTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can update bank_transactions" ON bank_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete bank_transactions" ON bank_transactions;

CREATE POLICY "Authorized users can view bank_transactions" ON bank_transactions
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert bank_transactions" ON bank_transactions
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update bank_transactions" ON bank_transactions
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete bank_transactions" ON bank_transactions
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON customers;

CREATE POLICY "Authorized users can view customers" ON customers
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert customers" ON customers
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update customers" ON customers
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete customers" ON customers
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON suppliers;

CREATE POLICY "Authorized users can view suppliers" ON suppliers
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update suppliers" ON suppliers
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete suppliers" ON suppliers
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- AGENCY_SETTINGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON agency_settings;
DROP POLICY IF EXISTS "Authenticated users can view agency_settings" ON agency_settings;
DROP POLICY IF EXISTS "Authenticated users can insert agency_settings" ON agency_settings;
DROP POLICY IF EXISTS "Authenticated users can update agency_settings" ON agency_settings;
DROP POLICY IF EXISTS "Authenticated users can delete agency_settings" ON agency_settings;

CREATE POLICY "Authorized users can view agency_settings" ON agency_settings
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert agency_settings" ON agency_settings
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update agency_settings" ON agency_settings
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete agency_settings" ON agency_settings
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- EXPORT_LOGS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON export_logs;
DROP POLICY IF EXISTS "Authenticated users can view export_logs" ON export_logs;
DROP POLICY IF EXISTS "Authenticated users can insert export_logs" ON export_logs;
DROP POLICY IF EXISTS "Authenticated users can update export_logs" ON export_logs;
DROP POLICY IF EXISTS "Authenticated users can delete export_logs" ON export_logs;

CREATE POLICY "Authorized users can view export_logs" ON export_logs
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert export_logs" ON export_logs
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update export_logs" ON export_logs
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete export_logs" ON export_logs
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- INVOICE_TRANSACTION_MATCHES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view matches" ON invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON invoice_transaction_matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON invoice_transaction_matches;

CREATE POLICY "Authorized users can view matches" ON invoice_transaction_matches
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert matches" ON invoice_transaction_matches
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update matches" ON invoice_transaction_matches
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete matches" ON invoice_transaction_matches
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON notifications;

CREATE POLICY "Authorized users can view notifications" ON notifications
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update notifications" ON notifications
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete notifications" ON notifications
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- SHAREABLE_LINKS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view shareable_links" ON shareable_links;
DROP POLICY IF EXISTS "Authenticated users can insert shareable_links" ON shareable_links;
DROP POLICY IF EXISTS "Authenticated users can update shareable_links" ON shareable_links;
DROP POLICY IF EXISTS "Authenticated users can delete shareable_links" ON shareable_links;

CREATE POLICY "Authorized users can view shareable_links" ON shareable_links
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert shareable_links" ON shareable_links
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update shareable_links" ON shareable_links
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete shareable_links" ON shareable_links
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- INVOICE_COMMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view invoice_comments" ON invoice_comments;
DROP POLICY IF EXISTS "Authenticated users can insert invoice_comments" ON invoice_comments;
DROP POLICY IF EXISTS "Authenticated users can update invoice_comments" ON invoice_comments;
DROP POLICY IF EXISTS "Authenticated users can delete invoice_comments" ON invoice_comments;

CREATE POLICY "Authorized users can view invoice_comments" ON invoice_comments
  FOR SELECT USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert invoice_comments" ON invoice_comments
  FOR INSERT WITH CHECK (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update invoice_comments" ON invoice_comments
  FOR UPDATE USING (public.is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete invoice_comments" ON invoice_comments
  FOR DELETE USING (public.is_authorized_user(auth.uid()));

-- =====================================================
-- EXPENSE_CATEGORIES TABLE (read-only for authorized users)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view expense_categories" ON expense_categories;

CREATE POLICY "Authorized users can view expense_categories" ON expense_categories
  FOR SELECT USING (public.is_authorized_user(auth.uid()));