export type PackageStatus = 'active' | 'completed';
export type InvoiceCategory = 'airline' | 'hotel' | 'tolls' | 'other';

export interface Package {
  id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  package_id: string | null;
  category: InvoiceCategory;
  merchant: string | null;
  amount: number | null;
  invoice_date: string | null;
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
