import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Package, Invoice, BankTransaction } from "@/types/database";
import {
  FileText, CreditCard, AlertCircle, FileSpreadsheet,
  Download, Folder, TrendingUp, TrendingDown, BarChart3,
  Link2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface PackageWithInvoices extends Package {
  invoices: Invoice[];
}

interface InvoiceListItem {
  id: string;
  import_id: string;
  invoice_date: string | null;
  invoice_number: string | null;
  mydata_code: string | null;
  client_name: string | null;
  client_vat: string | null;
  net_amount: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  mydata_mark: string | null;
  match_status: string;
  matched_income_id: string | null;
  matched_folder_id: string | null;
}

interface InvoiceListImport {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  period_month: string | null;
  row_count: number;
  matched_count: number;
  total_net: number;
  total_vat: number;
  total_gross: number;
  validated_totals: boolean;
  items: InvoiceListItem[];
}

// Extended BankTransaction with matching fields from DB
interface PortalTransaction extends BankTransaction {
  bank_name?: string | null;
  match_status?: string | null;
  matched_record_id?: string | null;
  matched_record_type?: string | null;
  category_type?: string | null;
  folder_id?: string | null;
  notes?: string | null;
}

interface PortalResponse {
  authorized: boolean;
  monthYear?: string;
  packages?: PackageWithInvoices[];
  transactions?: PortalTransaction[];
  generalInvoices?: Invoice[];
  invoiceListImports?: InvoiceListImport[];
  error?: string;
}

/* ── Helpers ── */
const eur = (n: number) => `€${n.toFixed(2)}`;
const fmtDate = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy") : "—";

const CATEGORY_LABELS: Record<string, string> = {
  hotel: "Ξενοδοχεία", airline: "Αεροπορικά", tolls: "Διόδια",
  fuel: "Καύσιμα", payroll: "Μισθοδοσία", government: "Δημόσιο / ΦΠΑ / ΕΦΚΑ",
  transport: "Μεταφορές Επιβατών", rent: "Ενοίκια / Πάγια",
  telecom: "Τηλεπικοινωνίες", insurance: "Ασφάλεια", office: "Γραφική Ύλη",
  maintenance: "Συντήρηση", marketing: "Διαφήμιση", other: "Λοιπά",
};

function SectionTitle({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4 mt-10 first:mt-0 print:break-before-auto flex items-center gap-3">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold shrink-0">{num}</span>
      {children}
    </h2>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`text-xs font-semibold text-gray-500 uppercase tracking-wider p-3 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right, mono, bold, className = "" }: { children: React.ReactNode; right?: boolean; mono?: boolean; bold?: boolean; className?: string }) {
  return (
    <td className={`p-3 text-sm ${right ? "text-right" : ""} ${mono ? "font-mono" : ""} ${bold ? "font-semibold" : ""} ${className}`}>
      {children}
    </td>
  );
}

function DownloadBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors print:hidden"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

function SmallDownload({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-blue-600 hover:text-blue-800 print:hidden p-1 rounded hover:bg-blue-50 transition-colors"
      title="Λήψη παραστατικού"
    >
      <Download className="h-3.5 w-3.5" />
    </button>
  );
}

function MatchBadge({ text, color = "gray" }: { text: string; color?: "green" | "blue" | "gray" | "amber" }) {
  const colors = {
    green: "bg-green-100 text-green-700 border-green-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {text}
    </span>
  );
}

/* ════════════════════════════════════════════ */
export default function AccountantPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [monthYear, setMonthYear] = useState("");
  const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
  const [generalInvoices, setGeneralInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<PortalTransaction[]>([]);
  const [invoiceListImports, setInvoiceListImports] = useState<InvoiceListImport[]>([]);

  useEffect(() => { verifyAndFetch(); }, [token]);

  async function verifyAndFetch() {
    if (!token) { setAuthorized(false); setLoading(false); return; }
    try {
      const { data, error } = await supabase.functions.invoke<PortalResponse>("accountant-portal-access", {
        body: { token, action: "get_data" },
      });
      if (error || !data?.authorized) { setAuthorized(false); setLoading(false); return; }
      setAuthorized(true);
      setMonthYear(data.monthYear || "");
      setPackages(data.packages || []);
      setGeneralInvoices(data.generalInvoices || []);
      setTransactions(data.transactions || []);
      setInvoiceListImports(data.invoiceListImports || []);
    } catch {
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  // Download via edge function (works without auth)
  const handleDownloadFile = async (bucket: string, filePath: string, fileName?: string) => {
    try {
      // Try via edge function first
      const { data, error } = await supabase.functions.invoke("accountant-portal-access", {
        body: { token, action: "get_file_url", bucket, filePath },
      });
      if (!error && data?.url) {
        window.open(data.url, "_blank");
        return;
      }
      // Fallback: try direct signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);
      if (signedError) throw signedError;
      if (bucket === "invoice-lists") {
        const link = document.createElement("a");
        link.href = signedData.signedUrl;
        link.download = fileName || "file";
        link.click();
      } else {
        window.open(signedData.signedUrl, "_blank");
      }
    } catch {
      toast.error("Αποτυχία λήψης αρχείου. Δοκιμάστε ξανά ή επικοινωνήστε μαζί μας.");
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Φόρτωση δεδομένων...</p>
        </div>
      </div>
    );
  }

  /* ── Not authorized ── */
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Μη Έγκυρος Σύνδεσμος</h2>
          <p className="text-gray-600 mb-5">
            Ο σύνδεσμος πρόσβασης έχει λήξει ή δεν είναι έγκυρος.
            Παρακαλώ επικοινωνήστε μαζί μας για νέο σύνδεσμο.
          </p>
          <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
            <p className="font-medium">ALFA Μονοπρόσωπη Ι.Κ.Ε.</p>
            <p>business@atravel.gr</p>
            <p>+30 694 207 2312</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Build lookup maps for cross-referencing ── */
  const allInvoices = [
    ...packages.flatMap(p => p.invoices),
    ...generalInvoices,
  ];
  const invoiceById = new Map(allInvoices.map(inv => [inv.id, inv]));
  const packageById = new Map(packages.map(pkg => [pkg.id, pkg]));

  // Map: invoiceId → transaction (from matched_record_id on transactions)
  const invoiceToTransaction = new Map<string, PortalTransaction>();
  const transactionToInvoice = new Map<string, Invoice>();
  transactions.forEach(txn => {
    if (txn.matched_record_id && txn.matched_record_type === "invoice") {
      transactionToInvoice.set(txn.id, invoiceById.get(txn.matched_record_id)!);
      invoiceToTransaction.set(txn.matched_record_id, txn);
    }
  });

  /* ── Calculations ── */
  const generalIncomeInvoices = generalInvoices.filter(i => (i.type || "expense") === "income");
  const generalExpenseInvoices = generalInvoices.filter(i => (i.type || "expense") === "expense");

  const totalIncome = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter(i => (i.type || "expense") === "income").reduce((s, i) => s + (i.amount || 0), 0), 0
  ) + generalIncomeInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const totalExpenses = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter(i => (i.type || "expense") === "expense").reduce((s, i) => s + (i.amount || 0), 0), 0
  ) + generalExpenseInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const profit = totalIncome - totalExpenses;

  const downloadableExcels = invoiceListImports.filter(imp => imp.file_path);
  const allInvoiceListItems = invoiceListImports.flatMap(imp => imp.items || []);
  const monthLabel = monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy", { locale: el }) : "";

  // Helper to find what a transaction corresponds to
  function getTransactionMatchLabel(txn: PortalTransaction): { label: string; color: "green" | "blue" | "amber" | "gray" } {
    // Check if matched to an invoice
    const matchedInv = transactionToInvoice.get(txn.id);
    if (matchedInv) {
      const invType = (matchedInv.type || "expense") === "income" ? "Έσοδο" : "Έξοδο";
      const merchant = matchedInv.merchant || matchedInv.category || "";
      return { label: `${invType}: ${merchant}`, color: (matchedInv.type || "expense") === "income" ? "green" : "blue" };
    }
    // Check if linked to a package
    const pkgId = txn.package_id || txn.folder_id;
    if (pkgId) {
      const pkg = packageById.get(pkgId);
      if (pkg) return { label: `Φάκελος: ${pkg.client_name}`, color: "blue" };
    }
    // Check category_type
    if (txn.category_type) {
      return { label: CATEGORY_LABELS[txn.category_type] || txn.category_type, color: "amber" };
    }
    if (txn.match_status === "matched") {
      return { label: "Αντιστοιχισμένο", color: "green" };
    }
    return { label: "Μη αντιστοιχισμένο", color: "gray" };
  }

  // Helper to find what an invoice list item corresponds to
  function getInvoiceListMatchLabel(item: InvoiceListItem): { label: string; color: "green" | "blue" | "gray" } {
    if (item.matched_folder_id) {
      const pkg = packageById.get(item.matched_folder_id);
      if (pkg) return { label: `Φάκελος: ${pkg.client_name}`, color: "blue" };
      return { label: "Φάκελος", color: "blue" };
    }
    if (item.matched_income_id) {
      const inv = invoiceById.get(item.matched_income_id);
      if (inv) return { label: `${inv.merchant || "Έσοδο"}`, color: "green" };
      return { label: "Αντιστοιχισμένο", color: "green" };
    }
    if (item.match_status === "matched") {
      return { label: "Αντιστοιχισμένο", color: "green" };
    }
    return { label: "—", color: "gray" };
  }

  const hasFile = (inv: Invoice) => inv.file_path && !inv.file_path.startsWith("manual/");

  let secNum = 0;

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10 md:px-12 md:py-14">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-gray-900 pb-5 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              ALFA Μονοπρόσωπη Ι.Κ.Ε.
            </h1>
            <p className="text-gray-500 mt-1 capitalize">
              Μηνιαία Αναφορά — <span className="font-semibold text-gray-800">{monthLabel}</span>
            </p>
          </div>
          <div className="text-right text-sm text-gray-400 mt-3 md:mt-0">
            <p>business@atravel.gr</p>
            <p>+30 694 207 2312</p>
          </div>
        </div>

        {/* ── SUMMARY ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Σύνολο Εσόδων</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{eur(totalIncome)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Σύνολο Εξόδων</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{eur(totalExpenses)}</p>
          </div>
          <div className={`border rounded-xl p-5 ${profit >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: profit >= 0 ? "#1d4ed8" : "#b91c1c" }}>Καθαρό Κέρδος</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: profit >= 0 ? "#1d4ed8" : "#b91c1c" }}>{eur(profit)}</p>
          </div>
        </div>


        {/* ═══════════════════════════════════════════ */}
        {/* 1. ΑΡΧΕΙΑ ΓΙΑ ΛΗΨΗ                        */}
        {/* ═══════════════════════════════════════════ */}
        <SectionTitle num={++secNum}>Αρχεία για Λήψη</SectionTitle>

        {downloadableExcels.length > 0 ? (
          <div className="space-y-3 mb-4">
            {downloadableExcels.map(imp => (
              <div key={imp.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-gray-900">{imp.file_name}</p>
                    <p className="text-xs text-gray-500">{imp.row_count} τιμολόγια · {eur(imp.total_gross || 0)}</p>
                  </div>
                </div>
                <DownloadBtn onClick={() => handleDownloadFile("invoice-lists", imp.file_path, imp.file_name)} label="Λήψη Excel" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Δεν υπάρχουν αρχεία Excel αυτόν τον μήνα.</p>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 2. ΠΑΚΕΤΑ (Φάκελοι)                        */}
        {/* ═══════════════════════════════════════════ */}
        {packages.length > 0 && (
          <>
            <SectionTitle num={++secNum}>Πακέτα / Φάκελοι Ταξιδιών</SectionTitle>
            <p className="text-sm text-gray-500 mb-4 -mt-2">
              Κάθε πακέτο περιέχει τα έσοδα από τον πελάτη και τα αντίστοιχα έξοδα προμηθευτών.
            </p>
            {packages.map(pkg => {
              const incomes = pkg.invoices.filter(i => (i.type || "expense") === "income");
              const expenses = pkg.invoices.filter(i => (i.type || "expense") === "expense");
              const pkgIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0);
              const pkgExpenses = expenses.reduce((s, i) => s + (i.amount || 0), 0);
              const pkgProfit = pkgIncome - pkgExpenses;

              return (
                <div key={pkg.id} className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-gray-900">{pkg.client_name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {format(new Date(pkg.start_date), "dd/MM", { locale: el })} — {format(new Date(pkg.end_date), "dd/MM/yy", { locale: el })}
                      </span>
                    </div>
                    <span className={`font-bold text-sm ${pkgProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                      Κέρδος: {eur(pkgProfit)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 text-center text-sm border-b border-gray-100 py-2 bg-white">
                    <div><span className="text-gray-500">Έσοδα: </span><span className="font-semibold text-green-700">{eur(pkgIncome)}</span></div>
                    <div><span className="text-gray-500">Έξοδα: </span><span className="font-semibold text-red-600">{eur(pkgExpenses)}</span></div>
                    <div><span className="text-gray-500">Κέρδος: </span><span className={`font-semibold ${pkgProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>{eur(pkgProfit)}</span></div>
                  </div>

                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <Th>Τύπος</Th>
                        <Th>Προμηθευτής / Πελάτης</Th>
                        <Th>Κατηγορία</Th>
                        <Th>Ημερομηνία</Th>
                        <Th right>Ποσό</Th>
                        <Th>Αρχείο</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...incomes, ...expenses].map(inv => (
                        <tr key={inv.id}>
                          <Td>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${(inv.type || "expense") === "income" ? "bg-green-500" : "bg-red-400"}`} />
                            {(inv.type || "expense") === "income" ? "Έσοδο" : "Έξοδο"}
                          </Td>
                          <Td>{inv.merchant || "—"}</Td>
                          <Td>{CATEGORY_LABELS[inv.category] || inv.category}</Td>
                          <Td>{fmtDate(inv.invoice_date)}</Td>
                          <Td right bold>{eur(inv.amount || 0)}</Td>
                          <Td>
                            {hasFile(inv) ? (
                              <SmallDownload onClick={() => handleDownloadFile("invoices", inv.file_path)} />
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 3. ΓΕΝΙΚΑ ΕΣΟΔΑ                            */}
        {/* ═══════════════════════════════════════════ */}
        {generalIncomeInvoices.length > 0 && (
          <>
            <SectionTitle num={++secNum}>Γενικά Έσοδα (εκτός πακέτων)</SectionTitle>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Περιγραφή</Th>
                    <Th>Κατηγορία</Th>
                    <Th>Ημερομηνία</Th>
                    <Th>Αντιστοιχεί σε</Th>
                    <Th right>Ποσό</Th>
                    <Th>Αρχείο</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generalIncomeInvoices.map(inv => {
                    const txn = invoiceToTransaction.get(inv.id);
                    return (
                      <tr key={inv.id}>
                        <Td>{inv.merchant || inv.file_name || "—"}</Td>
                        <Td>{CATEGORY_LABELS[inv.category] || inv.category}</Td>
                        <Td>{fmtDate(inv.invoice_date)}</Td>
                        <Td>
                          {txn ? (
                            <span className="text-xs text-gray-500">
                              Κίνηση {fmtDate(txn.transaction_date)} · {eur(Math.abs(txn.amount))}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </Td>
                        <Td right bold>{eur(inv.amount || 0)}</Td>
                        <Td>
                          {hasFile(inv) ? (
                            <SmallDownload onClick={() => handleDownloadFile("invoices", inv.file_path)} />
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-green-50">
                  <tr>
                    <td colSpan={4} className="p-3 text-sm font-semibold text-green-700">Σύνολο Γενικών Εσόδων</td>
                    <td className="p-3 text-sm font-bold text-right text-green-700">
                      {eur(generalIncomeInvoices.reduce((s, i) => s + (i.amount || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 4. ΓΕΝΙΚΑ ΕΞΟΔΑ                            */}
        {/* ═══════════════════════════════════════════ */}
        {generalExpenseInvoices.length > 0 && (
          <>
            <SectionTitle num={++secNum}>Γενικά Έξοδα (ανά κατηγορία)</SectionTitle>
            <p className="text-sm text-gray-500 mb-3 -mt-2">
              Κάθε γραμμή δείχνει τον προμηθευτή, την κατηγορία εξόδου και μπορείτε να κατεβάσετε το αντίστοιχο παραστατικό.
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Προμηθευτής</Th>
                    <Th>Κατηγορία</Th>
                    <Th>Ημερομηνία</Th>
                    <Th>Αντιστοιχεί σε</Th>
                    <Th right>Ποσό</Th>
                    <Th>Αρχείο</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generalExpenseInvoices
                    .sort((a, b) => (a.category || "other").localeCompare(b.category || "other"))
                    .map(inv => {
                      const txn = invoiceToTransaction.get(inv.id);
                      return (
                        <tr key={inv.id}>
                          <Td>{inv.merchant || inv.file_name || "—"}</Td>
                          <Td>
                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                              {CATEGORY_LABELS[inv.category] || inv.category}
                            </span>
                          </Td>
                          <Td>{fmtDate(inv.invoice_date)}</Td>
                          <Td>
                            {txn ? (
                              <span className="text-xs text-gray-500">
                                Κίνηση {fmtDate(txn.transaction_date)} · {eur(Math.abs(txn.amount))}
                              </span>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </Td>
                          <Td right bold>{eur(inv.amount || 0)}</Td>
                          <Td>
                            {hasFile(inv) ? (
                              <SmallDownload onClick={() => handleDownloadFile("invoices", inv.file_path)} />
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </Td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-red-50">
                  <tr>
                    <td colSpan={4} className="p-3 text-sm font-semibold text-red-700">Σύνολο Γενικών Εξόδων</td>
                    <td className="p-3 text-sm font-bold text-right text-red-700">
                      {eur(generalExpenseInvoices.reduce((s, i) => s + (i.amount || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Category subtotals */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {(() => {
                const cats = new Map<string, number>();
                generalExpenseInvoices.forEach(inv => {
                  const c = inv.category || "other";
                  cats.set(c, (cats.get(c) || 0) + (inv.amount || 0));
                });
                return Array.from(cats.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, total]) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm">
                      <span className="text-gray-600">{CATEGORY_LABELS[cat] || cat}</span>
                      <span className="font-semibold text-red-600">{eur(total)}</span>
                    </div>
                  ));
              })()}
            </div>
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 5. ΛΙΣΤΑ ΠΑΡΑΣΤΑΤΙΚΩΝ (τιμολόγια που κόψαμε) */}
        {/* ═══════════════════════════════════════════ */}
        {allInvoiceListItems.length > 0 && (
          <>
            <SectionTitle num={++secNum}>Τιμολόγια που Εκδώσαμε</SectionTitle>
            <p className="text-sm text-gray-500 mb-3 -mt-2">
              {allInvoiceListItems.length} τιμολόγια — στήλη «Αντιστοιχεί σε» δείχνει σε ποιον φάκελο ή συναλλαγή ανήκει.
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Ημ/νία</Th>
                    <Th>Αρ. Παραστ.</Th>
                    <Th>Πελάτης</Th>
                    <Th>ΑΦΜ</Th>
                    <Th>Αντιστοιχεί σε</Th>
                    <Th right>Καθαρή</Th>
                    <Th right>ΦΠΑ</Th>
                    <Th right>Σύνολο</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allInvoiceListItems.map(item => {
                    const match = getInvoiceListMatchLabel(item);
                    return (
                      <tr key={item.id}>
                        <Td>{item.invoice_date ? format(new Date(item.invoice_date), "dd/MM/yy") : "—"}</Td>
                        <Td mono>{item.invoice_number || "—"}</Td>
                        <Td>{item.client_name || "—"}</Td>
                        <Td mono className="text-xs">{item.client_vat || "—"}</Td>
                        <Td>
                          <MatchBadge text={match.label} color={match.color} />
                        </Td>
                        <Td right>{eur(item.net_amount || 0)}</Td>
                        <Td right>{eur(item.vat_amount || 0)}</Td>
                        <Td right bold>{eur(item.total_amount || 0)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={5} className="p-3 text-sm font-semibold">Σύνολα</td>
                    <td className="p-3 text-sm font-bold text-right">{eur(allInvoiceListItems.reduce((s, i) => s + (i.net_amount || 0), 0))}</td>
                    <td className="p-3 text-sm font-bold text-right">{eur(allInvoiceListItems.reduce((s, i) => s + (i.vat_amount || 0), 0))}</td>
                    <td className="p-3 text-sm font-bold text-right">{eur(allInvoiceListItems.reduce((s, i) => s + (i.total_amount || 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 6. ΤΡΑΠΕΖΙΚΕΣ ΚΙΝΗΣΕΙΣ                     */}
        {/* ═══════════════════════════════════════════ */}
        {transactions.length > 0 && (
          <>
            <SectionTitle num={++secNum}>Τραπεζικές Κινήσεις</SectionTitle>
            <p className="text-sm text-gray-500 mb-3 -mt-2">
              {transactions.length} κινήσεις — στήλη «Αντιστοιχεί σε» δείχνει σε ποιο έσοδο, έξοδο ή φάκελο ανήκει η κάθε κίνηση.
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Ημερομηνία</Th>
                    <Th>Περιγραφή</Th>
                    <Th>Τράπεζα</Th>
                    <Th>Αντιστοιχεί σε</Th>
                    <Th right>Ποσό</Th>
                    <Th>Τύπος</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(txn => {
                    const match = getTransactionMatchLabel(txn);
                    return (
                      <tr key={txn.id}>
                        <Td>{fmtDate(txn.transaction_date)}</Td>
                        <Td>{txn.description}</Td>
                        <Td className="text-xs text-gray-500">{txn.bank_name || "—"}</Td>
                        <Td>
                          <MatchBadge text={match.label} color={match.color} />
                        </Td>
                        <Td right mono bold>{eur(Math.abs(txn.amount))}</Td>
                        <Td>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${txn.amount >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {txn.amount >= 0 ? "Πίστωση" : "Χρέωση"}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="p-3 text-sm font-semibold">Σύνολο</td>
                    <td className="p-3 text-sm font-bold text-right font-mono">{eur(transactions.reduce((s, t) => s + t.amount, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}


        {/* ── FOOTER ── */}
        <div className="mt-14 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>ALFA Μονοπρόσωπη Ι.Κ.Ε. · Γραφείο Γενικού Τουρισμού</p>
          <p className="mt-1">© {new Date().getFullYear()} · Αυτό το έγγραφο δημιουργήθηκε αυτόματα</p>
        </div>
      </div>
    </div>
  );
}
