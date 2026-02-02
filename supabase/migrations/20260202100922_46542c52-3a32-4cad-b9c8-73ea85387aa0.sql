-- Restrict agency_settings access to admin users only
-- Banking information (IBAN, SWIFT, bank_name) should only be accessible by admins

-- First, drop the existing overly permissive policies
DROP POLICY IF EXISTS "Authorized users can view agency_settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Authorized users can insert agency_settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Authorized users can update agency_settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Authorized users can delete agency_settings" ON public.agency_settings;

-- Create new admin-only policies for agency_settings
-- Only admins should access sensitive banking information
CREATE POLICY "Only admins can view agency_settings" 
ON public.agency_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert agency_settings" 
ON public.agency_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update agency_settings" 
ON public.agency_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete agency_settings" 
ON public.agency_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));