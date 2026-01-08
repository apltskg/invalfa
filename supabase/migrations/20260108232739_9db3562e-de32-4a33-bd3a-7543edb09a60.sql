-- Create enum types
CREATE TYPE public.package_status AS ENUM ('active', 'completed');
CREATE TYPE public.invoice_category AS ENUM ('airline', 'hotel', 'tolls', 'other');

-- Create packages table
CREATE TABLE public.packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status package_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    category invoice_category NOT NULL DEFAULT 'other',
    merchant TEXT,
    amount DECIMAL(10, 2),
    invoice_date DATE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    extracted_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
    needs_invoice BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create export_logs table
CREATE TABLE public.export_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    packages_included INTEGER NOT NULL DEFAULT 0,
    invoices_included INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS on all tables (but with permissive policies for single-user)
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (single-user system)
CREATE POLICY "Allow all operations on packages" ON public.packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on bank_transactions" ON public.bank_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on export_logs" ON public.export_logs FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_transactions_updated_at BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);

-- Storage policies for invoices bucket
CREATE POLICY "Public read access for invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');
CREATE POLICY "Anyone can upload invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Anyone can update invoices" ON storage.objects FOR UPDATE USING (bucket_id = 'invoices');
CREATE POLICY "Anyone can delete invoices" ON storage.objects FOR DELETE USING (bucket_id = 'invoices');