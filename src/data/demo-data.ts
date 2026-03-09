// Static mock data for demo mode — no Supabase calls needed

export const demoPackages = [
  { id: "pkg-1", client_name: "Athens Weekend Getaway", start_date: "2025-04-15", end_date: "2025-04-18", status: "active", created_at: "2025-03-01T10:00:00Z", updated_at: "2025-03-01T10:00:00Z", customer_id: "cust-1", invoiceCount: 4, totalAmount: 2450 },
  { id: "pkg-2", client_name: "Santorini Luxury Tour", start_date: "2025-05-01", end_date: "2025-05-07", status: "active", created_at: "2025-02-15T10:00:00Z", updated_at: "2025-02-15T10:00:00Z", customer_id: "cust-2", invoiceCount: 7, totalAmount: 8920 },
  { id: "pkg-3", client_name: "Crete Family Adventure", start_date: "2025-06-10", end_date: "2025-06-17", status: "active", created_at: "2025-01-20T10:00:00Z", updated_at: "2025-01-20T10:00:00Z", customer_id: "cust-3", invoiceCount: 5, totalAmount: 5340 },
  { id: "pkg-4", client_name: "Rhodes Cultural Trip", start_date: "2025-03-01", end_date: "2025-03-05", status: "completed", created_at: "2025-01-10T10:00:00Z", updated_at: "2025-03-06T10:00:00Z", customer_id: null, invoiceCount: 3, totalAmount: 1870 },
  { id: "pkg-5", client_name: "Mykonos Beach Retreat", start_date: "2025-07-20", end_date: "2025-07-25", status: "active", created_at: "2025-03-05T10:00:00Z", updated_at: "2025-03-05T10:00:00Z", customer_id: "cust-1", invoiceCount: 2, totalAmount: 3200 },
];

export const demoInvoices = [
  { id: "inv-1", file_name: "olympic_air_ATH_JTR.pdf", amount: 890, category: "airline", merchant: "Olympic Airways", invoice_date: "2025-04-15", type: "expense", package_id: "pkg-1" },
  { id: "inv-2", file_name: "grand_hotel_athens.pdf", amount: 560, category: "hotel", merchant: "Athens Grand Hotel", invoice_date: "2025-04-16", type: "expense", package_id: "pkg-1" },
  { id: "inv-3", file_name: "eurorent_SUV.pdf", amount: 320, category: "transport", merchant: "EuroRent Cars", invoice_date: "2025-04-15", type: "expense", package_id: "pkg-1" },
  { id: "inv-4", file_name: "acme_travel_payment.pdf", amount: 2450, category: "other", merchant: "Acme Travel Corp", invoice_date: "2025-04-14", type: "income", package_id: "pkg-1" },
  { id: "inv-5", file_name: "aegean_airlines_ATH_JTR.pdf", amount: 1240, category: "airline", merchant: "Aegean Airlines", invoice_date: "2025-05-01", type: "expense", package_id: "pkg-2" },
  { id: "inv-6", file_name: "canaves_oia_hotel.pdf", amount: 3200, category: "hotel", merchant: "Canaves Oia Suites", invoice_date: "2025-05-01", type: "expense", package_id: "pkg-2" },
  { id: "inv-7", file_name: "sunset_cruise.pdf", amount: 480, category: "transport", merchant: "Santorini Cruises", invoice_date: "2025-05-03", type: "expense", package_id: "pkg-2" },
  { id: "inv-8", file_name: "global_tours_payment.pdf", amount: 8920, category: "other", merchant: "Global Tours Ltd", invoice_date: "2025-04-28", type: "income", package_id: "pkg-2" },
];

export const demoTransactions = [
  { id: "txn-1", description: "OLYMPIC AIR / TKT 1234567", amount: -890, transaction_date: "2025-04-15", bank_name: "Eurobank", match_status: "matched", category_type: "expense" },
  { id: "txn-2", description: "ATHENS GRAND HOTEL", amount: -560, transaction_date: "2025-04-16", bank_name: "Eurobank", match_status: "matched", category_type: "expense" },
  { id: "txn-3", description: "EURORENT CARS PIRAEUS", amount: -320, transaction_date: "2025-04-15", bank_name: "Eurobank", match_status: "matched", category_type: "expense" },
  { id: "txn-4", description: "ACME TRAVEL CORP PAYMENT", amount: 2450, transaction_date: "2025-04-14", bank_name: "Alpha Bank", match_status: "matched", category_type: "income" },
  { id: "txn-5", description: "AEGEAN AIRLINES ATH-JTR", amount: -1240, transaction_date: "2025-05-01", bank_name: "Eurobank", match_status: "matched", category_type: "expense" },
  { id: "txn-6", description: "CANAVES OIA SUITES", amount: -3200, transaction_date: "2025-05-02", bank_name: "Piraeus Bank", match_status: "unmatched", category_type: "expense" },
  { id: "txn-7", description: "COSMOTE MOBILE 6974xxx", amount: -45, transaction_date: "2025-04-10", bank_name: "Eurobank", match_status: "unmatched", category_type: "expense" },
  { id: "txn-8", description: "EFKA CONTRIBUTIONS", amount: -380, transaction_date: "2025-04-01", bank_name: "Eurobank", match_status: "unmatched", category_type: "expense" },
  { id: "txn-9", description: "GLOBAL TOURS LTD WIRE", amount: 8920, transaction_date: "2025-04-28", bank_name: "Alpha Bank", match_status: "matched", category_type: "income" },
  { id: "txn-10", description: "SUNRISE HOLIDAYS DEPOSIT", amount: 2500, transaction_date: "2025-05-05", bank_name: "Alpha Bank", match_status: "unmatched", category_type: "income" },
];

export const demoCustomers = [
  { id: "cust-1", name: "Acme Travel Corp", email: "info@acmetravel.com", phone: "+30 210 1234567", vat_number: "123456789", address: "Athens, Greece" },
  { id: "cust-2", name: "Global Tours Ltd", email: "contact@globaltours.com", phone: "+30 210 9876543", vat_number: "987654321", address: "Thessaloniki, Greece" },
  { id: "cust-3", name: "Sunrise Holidays", email: "hello@sunriseholidays.com", phone: "+30 2810 555666", vat_number: "456789123", address: "Heraklion, Crete" },
];

export const demoSuppliers = [
  { id: "sup-1", name: "Olympic Airways", email: "bookings@olympic.gr", phone: "+30 210 1111111", vat_number: "111222333" },
  { id: "sup-2", name: "Athens Grand Hotel", email: "reservations@athensgrand.gr", phone: "+30 210 2222222", vat_number: "222333444" },
  { id: "sup-3", name: "EuroRent Cars", email: "fleet@eurorent.gr", phone: "+30 210 3333333", vat_number: "333444555" },
  { id: "sup-4", name: "Aegean Airlines", email: "corporate@aegeanair.com", phone: "+30 210 6261000", vat_number: "444555666" },
];

export const demoStats = {
  totalIncome: 13870,
  totalExpenses: 7135,
  matchedPercent: 72,
  unmatchedTransactions: 4,
  activePackages: 4,
  completedPackages: 1,
  totalInvoices: 8,
  pendingExpenses: 3,
};

export const demoTrendData = [
  { month: "Ιαν", income: 4200, expenses: 3100 },
  { month: "Φεβ", income: 5800, expenses: 4200 },
  { month: "Μαρ", income: 6300, expenses: 3800 },
  { month: "Απρ", income: 8920, expenses: 5600 },
  { month: "Μαΐ", income: 13870, expenses: 7135 },
];

export const demoCategoryData = [
  { name: "Airlines", value: 2130, color: "#3B82F6" },
  { name: "Hotels", value: 3760, color: "#8B5CF6" },
  { name: "Transport", value: 800, color: "#10B981" },
  { name: "Telecom", value: 45, color: "#F59E0B" },
  { name: "Government", value: 380, color: "#EF4444" },
];
