export type PackageStatus = 'quote' | 'active' | 'completed';
export type InvoiceCategory = 'airline' | 'hotel' | 'tolls' | 'transport' | 'activity' | 'other';
export type MatchStatus = 'confirmed' | 'pending' | 'rejected';
export type InvoiceType = 'expense' | 'income';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export interface Supplier {
  id: string;
  name: string;
  vat_number?: string;
  category?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  created_at: string;
}

export interface Package {
  id: string;
  client_name: string; // Keeping for backward compatibility, but ideally should use customer_id
  customer_id?: string;
  start_date: string;
  end_date: string;
  status: PackageStatus;
  target_margin_percent?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  package_id: string | null;
  supplier_id?: string | null;
  customer_id?: string | null;
  type: InvoiceType;
  category: InvoiceCategory;
  merchant: string | null;
  amount: number | null;
  currency?: string;
  payment_status: PaymentStatus;
  invoice_date: string | null;
  due_date?: string | null;
  file_path: string;
  file_name: string;
  extracted_data: ExtractedData | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedData {
  merchant?: string;
  amount?: number;
  date?: string;
  category?: InvoiceCategory;
  confidence?: number;
  raw_text?: string;
  currency?: string;
  vat_amount?: number;
  invoice_number?: string;
  items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
}

export interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  package_id: string | null;
  needs_invoice: boolean;
  status?: 'pending' | 'matched' | 'ignored';
  created_at: string;
  updated_at: string;
}

export interface InvoiceTransactionMatch {
  id: string;
  invoice_id: string;
  transaction_id: string;
  status: MatchStatus;
  matched_at: string;
  created_at: string;
}

export interface ExportLog {
  id: string;
  month_year: string;
  sent_at: string;
  packages_included: number;
  invoices_included: number;
}

export interface PackageWithInvoices extends Package {
  invoices: Invoice[];
  customer?: Customer;
}
