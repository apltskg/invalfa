
CREATE TABLE public.hub_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  customer_name text,
  message text,
  status text NOT NULL DEFAULT 'sent',
  email_sent_at timestamptz,
  viewed_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hub_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view hub_shares" ON public.hub_shares FOR SELECT USING (is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can insert hub_shares" ON public.hub_shares FOR INSERT WITH CHECK (is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can update hub_shares" ON public.hub_shares FOR UPDATE USING (is_authorized_user(auth.uid()));
CREATE POLICY "Authorized users can delete hub_shares" ON public.hub_shares FOR DELETE USING (is_authorized_user(auth.uid()));
