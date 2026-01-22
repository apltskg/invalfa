-- FIX STORAGE AND PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Create the 'invoices' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (standard for storage)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Storage Policies (Allow authenticated users to do everything)
-- Policy for SELECT (Viewing files)
DO $$ BEGIN
    CREATE POLICY "Give authenticated users access to invoices folder 1qjs_0" 
    ON storage.objects FOR SELECT 
    TO authenticated 
    USING (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Policy for INSERT (Uploading files)
DO $$ BEGIN
    CREATE POLICY "Give authenticated users access to invoices folder 1qjs_1" 
    ON storage.objects FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Policy for UPDATE
DO $$ BEGIN
    CREATE POLICY "Give authenticated users access to invoices folder 1qjs_2" 
    ON storage.objects FOR UPDATE 
    TO authenticated 
    USING (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Policy for DELETE
DO $$ BEGIN
    CREATE POLICY "Give authenticated users access to invoices folder 1qjs_3" 
    ON storage.objects FOR DELETE 
    TO authenticated 
    USING (bucket_id = 'invoices');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. FIX TABLE PERMISSIONS (Re-run to ensure INSERT works)

-- Drop existing policies to avoid conflicts/confusion
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.customers;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.invoices;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.packages;

-- Re-create simple "Do Everything" policies for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.proforma_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON public.packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Grant sequence usage (fixes "permission denied for sequence" errors)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Fix complete!
