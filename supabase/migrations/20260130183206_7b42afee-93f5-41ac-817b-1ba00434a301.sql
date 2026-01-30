-- Remove overly permissive policies that bypass role-based access control
-- These policies grant access to ALL authenticated users, bypassing the role-based restrictions

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON accountant_magic_links;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON proforma_invoices;

-- The role-based policies already exist and will enforce proper access:
-- 'Authorized staff can view/insert/update/delete' policies
-- These use is_authorized_user(auth.uid()) which checks user_roles table