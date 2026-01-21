-- 1. Create app_role enum for role-based access control
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table to store user role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create helper function to check if user has any role (is authorized staff)
CREATE OR REPLACE FUNCTION public.is_authorized_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- 6. RLS policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Update proforma_invoices RLS policies to require staff/admin role
DROP POLICY IF EXISTS "Authenticated users can view proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Authenticated users can insert proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Authenticated users can update proforma_invoices" ON public.proforma_invoices;
DROP POLICY IF EXISTS "Authenticated users can delete proforma_invoices" ON public.proforma_invoices;

CREATE POLICY "Authorized staff can view proforma_invoices"
ON public.proforma_invoices FOR SELECT
TO authenticated
USING (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can insert proforma_invoices"
ON public.proforma_invoices FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can update proforma_invoices"
ON public.proforma_invoices FOR UPDATE
TO authenticated
USING (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can delete proforma_invoices"
ON public.proforma_invoices FOR DELETE
TO authenticated
USING (public.is_authorized_user(auth.uid()));

-- 8. Update accountant_magic_links RLS policies to require staff/admin role
DROP POLICY IF EXISTS "Authenticated users can view magic links" ON public.accountant_magic_links;
DROP POLICY IF EXISTS "Authenticated users can create magic links" ON public.accountant_magic_links;
DROP POLICY IF EXISTS "Authenticated users can update magic links" ON public.accountant_magic_links;
DROP POLICY IF EXISTS "Authenticated users can delete magic links" ON public.accountant_magic_links;

CREATE POLICY "Authorized staff can view magic links"
ON public.accountant_magic_links FOR SELECT
TO authenticated
USING (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can create magic links"
ON public.accountant_magic_links FOR INSERT
TO authenticated
WITH CHECK (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can update magic links"
ON public.accountant_magic_links FOR UPDATE
TO authenticated
USING (public.is_authorized_user(auth.uid()));

CREATE POLICY "Authorized staff can delete magic links"
ON public.accountant_magic_links FOR DELETE
TO authenticated
USING (public.is_authorized_user(auth.uid()));

-- 9. Grant permissions
GRANT ALL ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authorized_user TO authenticated;