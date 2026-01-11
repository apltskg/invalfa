-- Create proforma_invoices table
CREATE TABLE public.proforma_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Client details
  client_name TEXT,
  client_address TEXT,
  client_email TEXT,
  client_vat_number TEXT,
  
  -- Line items stored as JSONB array
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Calculations
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 13,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Payment options
  accept_cash BOOLEAN NOT NULL DEFAULT true,
  accept_bank_transfer BOOLEAN NOT NULL DEFAULT true,
  
  -- Custom notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies (like other tables)
CREATE POLICY "Anyone can view proforma_invoices" 
ON public.proforma_invoices 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert proforma_invoices" 
ON public.proforma_invoices 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update proforma_invoices" 
ON public.proforma_invoices 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete proforma_invoices" 
ON public.proforma_invoices 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_proforma_invoices_updated_at
BEFORE UPDATE ON public.proforma_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS proforma_invoice_number_seq START WITH 1;