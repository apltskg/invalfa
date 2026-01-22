-- Add 'type' column to invoices table to distinguish income vs expense
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'expense' CHECK (type IN ('income', 'expense'));

-- Set existing records to default 'expense' type
UPDATE public.invoices SET type = 'expense' WHERE type IS NULL;