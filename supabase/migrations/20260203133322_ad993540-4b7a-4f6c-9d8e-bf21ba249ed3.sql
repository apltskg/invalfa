-- Add RLS policies for expense_categories management by authorized users

-- Allow authorized users to INSERT expense_categories
CREATE POLICY "Authorized users can insert expense_categories"
ON public.expense_categories
FOR INSERT
WITH CHECK (is_authorized_user(auth.uid()));

-- Allow authorized users to UPDATE expense_categories
CREATE POLICY "Authorized users can update expense_categories"
ON public.expense_categories
FOR UPDATE
USING (is_authorized_user(auth.uid()));

-- Allow authorized users to DELETE expense_categories
CREATE POLICY "Authorized users can delete expense_categories"
ON public.expense_categories
FOR DELETE
USING (is_authorized_user(auth.uid()));