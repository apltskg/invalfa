-- Fix security issues: Enable RLS on unprotected tables

-- 1. Enable RLS on expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_categories (read-only for authenticated users)
CREATE POLICY "Authenticated users can view expense_categories"
ON public.expense_categories FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Enable RLS on invoice_comments
ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_comments
CREATE POLICY "Authenticated users can view invoice_comments"
ON public.invoice_comments FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoice_comments"
ON public.invoice_comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoice_comments"
ON public.invoice_comments FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete invoice_comments"
ON public.invoice_comments FOR DELETE
USING (auth.role() = 'authenticated');

-- 3. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Authenticated users can view notifications"
ON public.notifications FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notifications"
ON public.notifications FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notifications"
ON public.notifications FOR DELETE
USING (auth.role() = 'authenticated');

-- 4. Enable RLS on shareable_links
ALTER TABLE public.shareable_links ENABLE ROW LEVEL SECURITY;

-- Create policies for shareable_links
CREATE POLICY "Authenticated users can view shareable_links"
ON public.shareable_links FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert shareable_links"
ON public.shareable_links FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update shareable_links"
ON public.shareable_links FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete shareable_links"
ON public.shareable_links FOR DELETE
USING (auth.role() = 'authenticated');

-- 5. Create a SECURITY DEFINER function for validating magic link tokens
-- This allows the accountant portal edge function to validate tokens without exposing data
CREATE OR REPLACE FUNCTION public.validate_magic_link_token(_token text)
RETURNS TABLE (
  id uuid,
  month_year text,
  expires_at timestamptz,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    aml.id,
    aml.month_year,
    aml.expires_at,
    (aml.expires_at > NOW()) as is_valid
  FROM public.accountant_magic_links aml
  WHERE aml.token = _token
  LIMIT 1;
$$;

-- 6. Create function to update magic link access (for logging)
CREATE OR REPLACE FUNCTION public.update_magic_link_access(_link_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.accountant_magic_links
  SET 
    accessed_count = COALESCE(accessed_count, 0) + 1,
    last_accessed_at = NOW()
  WHERE id = _link_id;
$$;