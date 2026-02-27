export type PackageStatus = 'quote' | 'active' | 'completed';
export type InvoiceCategory = 'airline' | 'hotel' | 'tolls' | 'fuel' | 'transport' | 'payroll' | 'government' | 'rent' | 'telecom' | 'insurance' | 'office' | 'maintenance' | 'marketing' | 'other';
export type MatchStatus = 'confirmed' | 'pending' | 'rejected';

export interface Package {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  invoice_instructions: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  package_id: string | null;
  type: 'income' | 'expense';
  category: InvoiceCategory;
  merchant: string | null;
  amount: number | null;
  invoice_date: string | null;
  file_path: string;
  file_name: string;
  extracted_data: ExtractedData | null;
  supplier_id?: string | null;
  customer_id?: string | null;
  payment_status?: 'paid' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface ExtractedData {
  merchant?: string;
  amount?: number;
  net_amount?: number;
  date?: string;
  category?: InvoiceCategory;
  confidence?: number;
  raw_text?: string;
  currency?: string;
  vat_amount?: number;
  vat_rate?: number;
  invoice_number?: string;
  tax_id?: string;
  buyer_name?: string;
  buyer_vat?: string;
  document_type?: 'invoice' | 'receipt' | 'credit_note' | 'proforma';
  items?: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
}

export interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  package_id: string | null;
  needs_invoice: boolean;
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
}
