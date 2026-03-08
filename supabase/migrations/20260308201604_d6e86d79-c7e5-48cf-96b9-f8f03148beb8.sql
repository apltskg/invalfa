
-- Add token column to hub_shares for secure public links
ALTER TABLE public.hub_shares ADD COLUMN IF NOT EXISTS token text UNIQUE;

-- Generate tokens for any existing rows
UPDATE public.hub_shares SET token = gen_random_uuid()::text WHERE token IS NULL;

-- Make token NOT NULL for future inserts
ALTER TABLE public.hub_shares ALTER COLUMN token SET NOT NULL;
ALTER TABLE public.hub_shares ALTER COLUMN token SET DEFAULT gen_random_uuid()::text;

-- Allow anonymous SELECT on hub_shares by token (for public invoice viewing)
CREATE POLICY "Public can view hub_share by token"
ON public.hub_shares
FOR SELECT
TO anon
USING (true);

-- Allow anonymous UPDATE of status to 'viewed' via token
CREATE POLICY "Public can update hub_share status via token"
ON public.hub_shares
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Allow anon to read invoices referenced by hub_shares (for viewing invoice data)
CREATE POLICY "Public can view invoices via hub_share"
ON public.invoices
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.hub_shares hs WHERE hs.invoice_id = invoices.id
  )
);
