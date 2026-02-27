import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Package, Invoice, BankTransaction } from "@/types/database";
import {
  FileText, CreditCard, AlertCircle, FileSpreadsheet,
  Download, Folder, TrendingUp, TrendingDown, BarChart3,
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

interface PortalResponse {
  authorized: boolean;
  monthYear?: string;
  packages?: PackageWithInvoices[];
  transactions?: BankTransaction[];
  generalInvoices?: Invoice[];
  invoiceListImports?: InvoiceListImport[];
  error?: string;
}

/* ── Helpers ── */
const eur = (n: number) => `€${n.toFixed(2)}`;
const fmtDate = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy") : "—";

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

function Td({ children, right, mono, bold }: { children: React.ReactNode; right?: boolean; mono?: boolean; bold?: boolean }) {
  return (
    <td className={`p-3 text-sm ${right ? "text-right" : ""} ${mono ? "font-mono" : ""} ${bold ? "font-semibold" : ""}`}>
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

/* ════════════════════════════════════════════ */
export default function AccountantPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [monthYear, setMonthYear] = useState("");
  const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
  const [generalInvoices, setGeneralInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
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

  const handleDownloadExcel = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("invoice-lists").createSignedUrl(filePath, 3600);
      if (error) throw error;
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      link.click();
    } catch {
      toast.error("Αποτυχία λήψης αρχείου");
    }
  };

  const handleDownloadInvoice = async (filePath: string | null | undefined) => {
    if (!filePath) { toast.error("Δεν υπάρχει αρχείο"); return; }
    try {
      const { data, error } = await supabase.storage.from("invoices").createSignedUrl(filePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Αποτυχία λήψης αρχείου");
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

  // Category grouping for general expenses
  const expensesByCategory = new Map<string, { invoices: Invoice[]; total: number }>();
  generalExpenseInvoices.forEach(inv => {
    const cat = inv.category || "other";
    if (!expensesByCategory.has(cat)) expensesByCategory.set(cat, { invoices: [], total: 0 });
    const entry = expensesByCategory.get(cat)!;
    entry.invoices.push(inv);
    entry.total += inv.amount || 0;
  });

  const CATEGORY_LABELS: Record<string, string> = {
    hotel: "Ξενοδοχεία", airline: "Αεροπορικά", tolls: "Διόδια",
    fuel: "Καύσιμα", payroll: "Μισθοδοσία", government: "Δημόσιο / ΦΠΑ / ΕΦΚΑ",
    transport: "Μεταφορές Επιβατών", rent: "Ενοίκια / Πάγια",
    telecom: "Τηλεπικοινωνίες", insurance: "Ασφάλεια", office: "Γραφική Ύλη",
    other: "Λοιπά",
  };

  const downloadableExcels = invoiceListImports.filter(imp => imp.file_path);
  const allInvoiceListItems = invoiceListImports.flatMap(imp => imp.items || []);

  const monthLabel = monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy", { locale: el }) : "";

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 md:px-12 md:py-14">

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
        <SectionTitle num={1}>Αρχεία για Λήψη</SectionTitle>

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
                <DownloadBtn onClick={() => handleDownloadExcel(imp.file_path, imp.file_name)} label="Λήψη Excel" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Δεν υπάρχουν αρχεία Excel για λήψη αυτόν τον μήνα.</p>
        )}

        {/* Individual invoice file downloads */}
        {(() => {
          const allDownloadable = [
            ...packages.flatMap(p => p.invoices),
            ...generalInvoices,
          ].filter(inv => inv.file_path && !inv.file_path.startsWith("manual/"));
          if (allDownloadable.length === 0) return null;
          return (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">Παραστατικά (μεμονωμένα PDF):</p>
              <div className="space-y-1">
                {allDownloadable.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-700">{inv.merchant || inv.file_name || inv.category}</span>
                      <span className="text-gray-400">· {fmtDate(inv.invoice_date)}</span>
                      <span className="text-gray-400">· {eur(inv.amount || 0)}</span>
                    </div>
                    <button
                      onClick={() => handleDownloadInvoice(inv.file_path)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 print:hidden"
                    >
                      <Download className="h-3 w-3" /> Λήψη
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}


        {/* ═══════════════════════════════════════════ */}
        {/* 2. ΠΑΚΕΤΑ (Φάκελοι)                        */}
        {/* ═══════════════════════════════════════════ */}
        {packages.length > 0 && (
          <>
            <SectionTitle num={2}>Πακέτα / Φάκελοι Ταξιδιών</SectionTitle>
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
                  {/* Package header */}
                  <div className="bg-gray-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-gray-900">{pkg.client_name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {format(new Date(pkg.start_date), "dd/MM", { locale: el })} — {format(new Date(pkg.end_date), "dd/MM/yy", { locale: el })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-sm ${pkgProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>
                        Κέρδος: {eur(pkgProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-3 text-center text-sm border-b border-gray-100 py-2 bg-white">
                    <div>
                      <span className="text-gray-500">Έσοδα: </span>
                      <span className="font-semibold text-green-700">{eur(pkgIncome)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Έξοδα: </span>
                      <span className="font-semibold text-red-600">{eur(pkgExpenses)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Κέρδος: </span>
                      <span className={`font-semibold ${pkgProfit >= 0 ? "text-blue-700" : "text-red-600"}`}>{eur(pkgProfit)}</span>
                    </div>
                  </div>

                  {/* Invoices table */}
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <Th>Τύπος</Th>
                        <Th>Προμηθευτής / Πελάτης</Th>
                        <Th>Ημερομηνία</Th>
                        <Th right>Ποσό</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...incomes, ...expenses].map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-50/50">
                          <Td>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${(inv.type || "expense") === "income" ? "bg-green-500" : "bg-red-400"}`} />
                            {(inv.type || "expense") === "income" ? "Έσοδο" : "Έξοδο"}
                          </Td>
                          <Td>{inv.merchant || inv.category || "—"}</Td>
                          <Td>{fmtDate(inv.invoice_date)}</Td>
                          <Td right bold>{eur(inv.amount || 0)}</Td>
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
            <SectionTitle num={3}>Γενικά Έσοδα (εκτός πακέτων)</SectionTitle>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <Th>Περιγραφή</Th>
                  <Th>Κατηγορία</Th>
                  <Th>Ημερομηνία</Th>
                  <Th right>Ποσό</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {generalIncomeInvoices.map(inv => (
                  <tr key={inv.id}>
                    <Td>{inv.merchant || inv.file_name || "—"}</Td>
                    <Td>{CATEGORY_LABELS[inv.category] || inv.category}</Td>
                    <Td>{fmtDate(inv.invoice_date)}</Td>
                    <Td right bold>{eur(inv.amount || 0)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50">
                <tr>
                  <td colSpan={3} className="p-3 text-sm font-semibold text-green-700">Σύνολο Γενικών Εσόδων</td>
                  <td className="p-3 text-sm font-bold text-right text-green-700">{eur(generalIncomeInvoices.reduce((s, i) => s + (i.amount || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 4. ΓΕΝΙΚΑ ΕΞΟΔΑ (ανά κατηγορία)            */}
        {/* ═══════════════════════════════════════════ */}
        {generalExpenseInvoices.length > 0 && (
          <>
            <SectionTitle num={4}>Γενικά Έξοδα (ανά κατηγορία)</SectionTitle>

            {Array.from(expensesByCategory.entries())
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cat, { invoices: catInvoices, total }]) => (
                <div key={cat} className="mb-5">
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-t-xl px-4 py-2">
                    <p className="text-sm font-semibold text-gray-800">{CATEGORY_LABELS[cat] || cat}</p>
                    <p className="text-sm font-bold text-red-600">{eur(total)}</p>
                  </div>
                  <table className="w-full text-sm border-x border-b border-gray-200 rounded-b-xl overflow-hidden">
                    <tbody className="divide-y divide-gray-100">
                      {catInvoices.map(inv => (
                        <tr key={inv.id}>
                          <Td>{inv.merchant || inv.file_name || "—"}</Td>
                          <Td>{fmtDate(inv.invoice_date)}</Td>
                          <Td right bold>{eur(inv.amount || 0)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

            <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded-xl px-5 py-3 mt-2">
              <p className="font-bold text-red-700">Σύνολο Γενικών Εξόδων</p>
              <p className="text-xl font-bold text-red-700">{eur(generalExpenseInvoices.reduce((s, i) => s + (i.amount || 0), 0))}</p>
            </div>
          </>
        )}


        {/* ═══════════════════════════════════════════ */}
        {/* 5. ΛΙΣΤΑ ΠΑΡΑΣΤΑΤΙΚΩΝ                       */}
        {/* ═══════════════════════════════════════════ */}
        {allInvoiceListItems.length > 0 && (
          <>
            <SectionTitle num={5}>Λίστα Παραστατικών (εκδοθέντα τιμολόγια)</SectionTitle>
            <p className="text-sm text-gray-500 mb-3 -mt-2">
              Τιμολόγια που κόψαμε — {allInvoiceListItems.length} συνολικά
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Ημ/νία</Th>
                    <Th>Αρ. Παραστατικού</Th>
                    <Th>Πελάτης</Th>
                    <Th>ΑΦΜ</Th>
                    <Th right>Καθαρή</Th>
                    <Th right>ΦΠΑ</Th>
                    <Th right>Σύνολο</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allInvoiceListItems.map(item => (
                    <tr key={item.id}>
                      <Td>{item.invoice_date ? format(new Date(item.invoice_date), "dd/MM/yy") : "—"}</Td>
                      <Td mono>{item.invoice_number || "—"}</Td>
                      <Td>{item.client_name || "—"}</Td>
                      <Td mono>{item.client_vat || "—"}</Td>
                      <Td right>{eur(item.net_amount || 0)}</Td>
                      <Td right>{eur(item.vat_amount || 0)}</Td>
                      <Td right bold>{eur(item.total_amount || 0)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="p-3 text-sm font-semibold">Σύνολα</td>
                    <td className="p-3 text-sm font-bold text-right">
                      {eur(allInvoiceListItems.reduce((s, i) => s + (i.net_amount || 0), 0))}
                    </td>
                    <td className="p-3 text-sm font-bold text-right">
                      {eur(allInvoiceListItems.reduce((s, i) => s + (i.vat_amount || 0), 0))}
                    </td>
                    <td className="p-3 text-sm font-bold text-right">
                      {eur(allInvoiceListItems.reduce((s, i) => s + (i.total_amount || 0), 0))}
                    </td>
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
            <SectionTitle num={6}>Τραπεζικές Κινήσεις</SectionTitle>
            <p className="text-sm text-gray-500 mb-3 -mt-2">
              {transactions.length} κινήσεις
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <Th>Ημερομηνία</Th>
                    <Th>Περιγραφή</Th>
                    <Th right>Ποσό</Th>
                    <Th>Τύπος</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(txn => (
                    <tr key={txn.id}>
                      <Td>{fmtDate(txn.transaction_date)}</Td>
                      <Td>{txn.description}</Td>
                      <Td right mono bold>{eur(Math.abs(txn.amount))}</Td>
                      <Td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${txn.amount >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {txn.amount >= 0 ? "Πίστωση" : "Χρέωση"}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="p-3 text-sm font-semibold">Σύνολο</td>
                    <td className="p-3 text-sm font-bold text-right font-mono">
                      {eur(transactions.reduce((s, t) => s + t.amount, 0))}
                    </td>
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
