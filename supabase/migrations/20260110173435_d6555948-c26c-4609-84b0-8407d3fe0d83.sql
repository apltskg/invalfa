-- Create invoice_transaction_matches table for manual matching
CREATE TABLE public.invoice_transaction_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'rejected')),
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, transaction_id)
);

-- Enable RLS
ALTER TABLE public.invoice_transaction_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated users
CREATE POLICY "Authenticated users can view matches"
ON public.invoice_transaction_matches FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert matches"
ON public.invoice_transaction_matches FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update matches"
ON public.invoice_transaction_matches FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete matches"
ON public.invoice_transaction_matches FOR DELETE
USING (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX idx_invoice_transaction_matches_invoice_id ON public.invoice_transaction_matches(invoice_id);
CREATE INDEX idx_invoice_transaction_matches_transaction_id ON public.invoice_transaction_matches(transaction_id);

-- Create bank-statements storage bucket for PDF imports
INSERT INTO storage.buckets (id, name, public) VALUES ('bank-statements', 'bank-statements', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for bank-statements bucket
CREATE POLICY "Authenticated users can upload bank statements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view bank statements"
ON storage.objects FOR SELECT
USING (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete bank statements"
ON storage.objects FOR DELETE
USING (bucket_id = 'bank-statements' AND auth.role() = 'authenticated');