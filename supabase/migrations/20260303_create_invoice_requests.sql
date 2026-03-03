-- Create invoice_requests table
CREATE TABLE IF NOT EXISTS public.invoice_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lang TEXT NOT NULL DEFAULT 'el',
    
    full_name TEXT NOT NULL,
    company_name TEXT,
    vat_number TEXT NOT NULL,
    tax_office TEXT,
    address TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    
    transaction_date DATE,
    bank_transaction_ref TEXT,
    amount NUMERIC(10, 2),
    service_description TEXT DEFAULT 'Χωρίς Περιγραφή',
    notes TEXT,
    
    receipt_url TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.invoice_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insertions (for the public form)
CREATE POLICY "Allow anonymous inserts to invoice_requests"
ON public.invoice_requests FOR INSERT
TO public, anon
WITH CHECK (true);

-- Allow authenticated users to read all requests
CREATE POLICY "Allow authenticated read invoice_requests"
ON public.invoice_requests FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update requests
CREATE POLICY "Allow authenticated update invoice_requests"
ON public.invoice_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create a storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoice-receipts', 'invoice-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Allow anonymous to upload receipts"
ON storage.objects FOR INSERT
TO public, anon
WITH CHECK (bucket_id = 'invoice-receipts');

CREATE POLICY "Allow public read access to receipts"
ON storage.objects FOR SELECT
TO public, anon
USING (bucket_id = 'invoice-receipts');

CREATE POLICY "Allow authenticated full access to receipts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'invoice-receipts')
WITH CHECK (bucket_id = 'invoice-receipts');
