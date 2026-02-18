import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Package, Invoice, BankTransaction } from "@/types/database";
import {
  FileText, CreditCard, AlertCircle, FileSpreadsheet, Check,
  Download, ChevronDown, ChevronUp, Folder, TrendingUp,
  TrendingDown, BarChart3, ArrowRight, FileDown, Eye, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function AccountantPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [monthYear, setMonthYear] = useState("");
  const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
  const [generalInvoices, setGeneralInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [invoiceListImports, setInvoiceListImports] = useState<InvoiceListImport[]>([]);
  const [expandedImports, setExpandedImports] = useState<string[]>([]);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);

  useEffect(() => {
    verifyAndFetch();
  }, [token]);

  async function verifyAndFetch() {
    if (!token) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke<PortalResponse>('accountant-portal-access', {
        body: { token, action: 'get_data' }
      });

      if (error) {
        console.error("Portal access error:", error);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (!data?.authorized) {
        console.log("Not authorized:", data?.error);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setMonthYear(data.monthYear || "");
      setPackages(data.packages || []);
      setGeneralInvoices(data.generalInvoices || []);
      setTransactions(data.transactions || []);
      setInvoiceListImports(data.invoiceListImports || []);

      // Auto-expand first import
      if (data.invoiceListImports && data.invoiceListImports.length > 0) {
        setExpandedImports([data.invoiceListImports[0].id]);
      }
      // Auto-expand first package
      if (data.packages && data.packages.length > 0) {
        setExpandedPackages([data.packages[0].id]);
      }
    } catch (error) {
      console.error("Error verifying magic link:", error);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  }

  async function postFeedback(invoiceId: string, type: 'comment' | 'doubt', content: string) {
    if (!token) return;

    try {
      const { data, error } = await supabase.functions.invoke('accountant-portal-access', {
        body: {
          token,
          action: 'post_comment',
          invoiceId,
          commentText: content,
          isDoubt: type === 'doubt'
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || 'Failed to post feedback');
      }

      toast.success("Τα σχόλιά σας υποβλήθηκαν επιτυχώς");
    } catch (error) {
      console.error("Error posting feedback:", error);
      toast.error("Αποτυχία υποβολής σχολίων");
    }
  }

  const handleDownloadExcel = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('invoice-lists')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Αποτυχία λήψης αρχείου');
    }
  };

  const handleDownloadInvoice = async (filePath: string | null | undefined, fileName?: string) => {
    if (!filePath) {
      toast.error('Δεν υπάρχει αρχείο για λήψη');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Αποτυχία λήψης αρχείου');
    }
  };

  const toggleImportExpanded = (importId: string) => {
    setExpandedImports(prev =>
      prev.includes(importId)
        ? prev.filter(id => id !== importId)
        : [...prev, importId]
    );
  };

  const togglePackageExpanded = (pkgId: string) => {
    setExpandedPackages(prev =>
      prev.includes(pkgId)
        ? prev.filter(id => id !== pkgId)
        : [...prev, pkgId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-500/25 animate-pulse">
              <FileSpreadsheet className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Πύλη Λογιστή</h2>
          <p className="text-slate-600">Επαλήθευση πρόσβασης...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
        <Card className="p-10 max-w-md text-center rounded-3xl border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-500 to-orange-500 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <AlertCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Μη Έγκυρος Σύνδεσμος</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Ο σύνδεσμος πρόσβασης έχει λήξει ή δεν είναι έγκυρος.
            Παρακαλώ επικοινωνήστε με το γραφείο για νέο σύνδεσμο.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-500">
            <p className="font-medium mb-1">Always First Travel</p>
            <p>📧 info@alwaysfirst.gr</p>
            <p>📞 +30 210 XXX XXXX</p>
          </div>
        </Card>
      </div>
    );
  }

  // === Calculations ===
  const allPackageInvoices = packages.flatMap(p => p.invoices);
  const allInvoices = [...allPackageInvoices, ...generalInvoices];

  const generalIncomeInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'income');
  const generalExpenseInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'expense');

  const generalIncomeTotal = generalIncomeInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const generalExpensesTotal = generalExpenseInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const totalIncome = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0),
    0
  ) + generalIncomeTotal;

  const totalExpenses = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0),
    0
  ) + generalExpensesTotal;

  const profit = totalIncome - totalExpenses;

  const invoiceListTotal = invoiceListImports.reduce((sum, imp) => sum + (imp.total_gross || 0), 0);
  const invoiceListItemsCount = invoiceListImports.reduce((sum, imp) => sum + (imp.items?.length || 0), 0);
  const invoiceListMatchedCount = invoiceListImports.reduce((sum, imp) =>
    sum + (imp.items?.filter(i => i.match_status === 'matched').length || 0), 0);

  // Files available for download
  const downloadableInvoices = allInvoices.filter(inv => inv.file_path && !inv.file_path.startsWith('manual/'));
  const downloadableExcels = invoiceListImports.filter(imp => imp.file_path);

  // Category breakdown for report
  const categoryMap = new Map<string, { count: number; total: number; type: string }>();
  allInvoices.forEach(inv => {
    const cat = inv.category || 'other';
    const type = (inv.type || 'expense') as string;
    const key = `${type}-${cat}`;
    if (!categoryMap.has(key)) categoryMap.set(key, { count: 0, total: 0, type });
    const entry = categoryMap.get(key)!;
    entry.count++;
    entry.total += inv.amount || 0;
  });

  // Unique customers from invoice list
  const uniqueCustomers = new Map<string, { name: string; vat: string; totalAmount: number; invoiceCount: number }>();
  invoiceListImports.forEach(imp => {
    imp.items?.forEach(item => {
      const vat = item.client_vat?.trim();
      if (vat) {
        if (!uniqueCustomers.has(vat)) {
          uniqueCustomers.set(vat, { name: item.client_name || '', vat, totalAmount: 0, invoiceCount: 0 });
        }
        const entry = uniqueCustomers.get(vat)!;
        entry.totalAmount += item.total_amount || 0;
        entry.invoiceCount++;
      }
    });
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-gray-900 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ALFA Μονοπρόσωπη Ι.Κ.Ε.</h1>
            <p className="text-muted-foreground mt-1">
              Μηνιαία Αναφορά - {monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy", { locale: el }) : ""}
            </p>
          </div>
          <div className="text-right mt-4 md:mt-0 text-sm text-gray-500">
            <p>+30 694 207 2312</p>
            <p>business@atravel.gr</p>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-8 md:grid-cols-4">
          <Card className="p-6 rounded-2xl border-l-4 border-l-green-500">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εσοδα</p>
            </div>
            <p className="text-3xl font-light">€{totalIncome.toFixed(2)}</p>
          </Card>
          <Card className="p-6 rounded-2xl border-l-4 border-l-red-500">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εξοδα</p>
            </div>
            <p className="text-3xl font-light">€{totalExpenses.toFixed(2)}</p>
          </Card>
          <Card className="p-6 rounded-2xl border-l-4 border-l-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Καθαρο Κερδος</p>
            </div>
            <p className={`text-3xl font-medium ${profit >= 0 ? "text-gray-900" : "text-red-600"}`}>
              €{profit.toFixed(2)}
            </p>
          </Card>
          <Card className="p-6 rounded-2xl border-l-4 border-l-violet-500">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-violet-600" />
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Κινήσεις</p>
            </div>
            <p className="text-3xl font-light">{transactions.length}</p>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="files" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-2xl">
            <TabsTrigger value="files" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileDown className="h-4 w-4" />
              Αρχεία & Λήψεις
            </TabsTrigger>
            <TabsTrigger value="report" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4" />
              Αναφορά & Ανάλυση
            </TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileSpreadsheet className="h-4 w-4" />
              Λίστα Παραστατικών
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-xl gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4" />
              Τραπεζικές Κινήσεις
            </TabsTrigger>
          </TabsList>

          {/* ===== FILES & DOWNLOADS TAB ===== */}
          <TabsContent value="files" className="space-y-8">
            {/* Excel Files */}
            {downloadableExcels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  Αρχεία Excel (Λίστες Παραστατικών)
                </h3>
                <div className="grid gap-3">
                  {downloadableExcels.map(imp => (
                    <Card key={imp.id} className="p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
                          <FileSpreadsheet className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{imp.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {imp.row_count} τιμολόγια · €{(imp.total_gross || 0).toFixed(2)} συνολική αξία
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl gap-2"
                        onClick={() => handleDownloadExcel(imp.file_path, imp.file_name)}
                      >
                        <Download className="h-4 w-4" />
                        Λήψη
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Package Invoice Files */}
            {packages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Folder className="h-5 w-5 text-blue-600" />
                  Παραστατικά Πακέτων
                </h3>
                <div className="space-y-3">
                  {packages.map(pkg => {
                    const filesInPkg = pkg.invoices.filter(inv => inv.file_path && !inv.file_path.startsWith('manual/'));
                    if (filesInPkg.length === 0) return null;
                    return (
                      <Card key={pkg.id} className="rounded-2xl overflow-hidden">
                        <div className="p-4 bg-muted/30 font-medium flex items-center gap-2">
                          <Folder className="h-4 w-4 text-blue-600" />
                          {pkg.client_name}
                          <Badge variant="outline" className="ml-2">{filesInPkg.length} αρχεία</Badge>
                        </div>
                        <div className="divide-y">
                          {filesInPkg.map(inv => (
                            <div key={inv.id} className="p-3 px-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{inv.file_name || inv.merchant || 'Αρχείο'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {inv.invoice_date || '-'} · €{(inv.amount || 0).toFixed(2)}
                                    {inv.type === 'income' ? ' (Έσοδο)' : ' (Έξοδο)'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-blue-600 hover:text-blue-700"
                                onClick={() => handleDownloadInvoice(inv.file_path, inv.file_name || undefined)}
                              >
                                <Download className="h-3.5 w-3.5" />
                                Λήψη
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Invoice Files */}
            {downloadableInvoices.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  Γενικά Παραστατικά (χωρίς πακέτο)
                </h3>
                <Card className="rounded-2xl overflow-hidden divide-y">
                  {generalInvoices
                    .filter(inv => inv.file_path && !inv.file_path.startsWith('manual/'))
                    .map(inv => (
                      <div key={inv.id} className="p-3 px-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${(inv.type || 'expense') === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium">{inv.file_name || inv.merchant || inv.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {inv.invoice_date || '-'} · €{(inv.amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleDownloadInvoice(inv.file_path, inv.file_name || undefined)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                </Card>
              </div>
            )}

            {downloadableInvoices.length === 0 && downloadableExcels.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <FileDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Δεν υπάρχουν διαθέσιμα αρχεία</p>
                <p className="text-sm">Δεν έχουν ανέβει αρχεία για αυτόν τον μήνα</p>
              </div>
            )}
          </TabsContent>

          {/* ===== REPORT TAB ===== */}
          <TabsContent value="report" className="space-y-8">
            {/* Monthly Summary */}
            <Card className="rounded-3xl overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                <h3 className="text-xl font-bold">Μηνιαία Επισκόπηση</h3>
                <p className="text-white/70 text-sm mt-1">
                  {monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy", { locale: el }) : ""}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {/* Income vs Expense Breakdown */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Ανάλυση Εσόδων
                    </h4>
                    <div className="space-y-2">
                      {packages.map(pkg => {
                        const pkgIncome = pkg.invoices
                          .filter(i => (i.type || 'expense') === 'income')
                          .reduce((s, i) => s + (i.amount || 0), 0);
                        if (pkgIncome === 0) return null;
                        return (
                          <div key={pkg.id} className="flex justify-between items-center text-sm py-1">
                            <span className="text-muted-foreground">{pkg.client_name}</span>
                            <span className="font-medium text-green-600">€{pkgIncome.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      {generalIncomeTotal > 0 && (
                        <div className="flex justify-between items-center text-sm py-1">
                          <span className="text-muted-foreground">Γενικά Έσοδα</span>
                          <span className="font-medium text-green-600">€{generalIncomeTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t font-semibold">
                        <span>Σύνολο Εσόδων</span>
                        <span className="text-green-700">€{totalIncome.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" /> Ανάλυση Εξόδων
                    </h4>
                    <div className="space-y-2">
                      {packages.map(pkg => {
                        const pkgExpenses = pkg.invoices
                          .filter(i => (i.type || 'expense') === 'expense')
                          .reduce((s, i) => s + (i.amount || 0), 0);
                        if (pkgExpenses === 0) return null;
                        return (
                          <div key={pkg.id} className="flex justify-between items-center text-sm py-1">
                            <span className="text-muted-foreground">{pkg.client_name}</span>
                            <span className="font-medium text-red-600">€{pkgExpenses.toFixed(2)}</span>
                          </div>
                        );
                      })}
                      {generalExpensesTotal > 0 && (
                        <div className="flex justify-between items-center text-sm py-1">
                          <span className="text-muted-foreground">Γενικά Έξοδα</span>
                          <span className="font-medium text-red-600">€{generalExpensesTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t font-semibold">
                        <span>Σύνολο Εξόδων</span>
                        <span className="text-red-700">€{totalExpenses.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Profit */}
                <div className={`p-4 rounded-xl flex justify-between items-center ${profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className="font-bold text-lg">Καθαρό Αποτέλεσμα</span>
                  <span className={`font-bold text-2xl ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    €{profit.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Category Breakdown */}
            {categoryMap.size > 0 && (
              <Card className="rounded-2xl p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Ανάλυση ανά Κατηγορία
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from(categoryMap.entries())
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([key, { count, total, type }]) => {
                      const cat = key.replace(`${type}-`, '');
                      const isIncome = type === 'income';
                      return (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-sm capitalize">{cat}</span>
                            <Badge variant="outline" className="text-xs">{count}</Badge>
                          </div>
                          <span className={`font-medium text-sm ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                            €{total.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}

            {/* Customer List (from Invoice List) */}
            {uniqueCustomers.size > 0 && (
              <Card className="rounded-2xl p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Πελάτες από Λίστα Παραστατικών
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left p-3 font-medium">Επωνυμία</th>
                        <th className="text-left p-3 font-medium">Α.Φ.Μ.</th>
                        <th className="text-right p-3 font-medium">Τιμολόγια</th>
                        <th className="text-right p-3 font-medium">Συνολική Αξία</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Array.from(uniqueCustomers.values())
                        .sort((a, b) => b.totalAmount - a.totalAmount)
                        .map(customer => (
                          <tr key={customer.vat} className="hover:bg-muted/30">
                            <td className="p-3 font-medium">{customer.name}</td>
                            <td className="p-3 font-mono text-xs">{customer.vat}</td>
                            <td className="p-3 text-right">{customer.invoiceCount}</td>
                            <td className="p-3 text-right font-semibold">€{customer.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Package Details */}
            {packages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Folder className="h-5 w-5" /> Πακέτα Λεπτομερώς
                </h3>
                {packages.map(pkg => {
                  const pkgIncome = pkg.invoices.filter(i => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0);
                  const pkgExpenses = pkg.invoices.filter(i => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0);
                  const pkgProfit = pkgIncome - pkgExpenses;
                  const isExpanded = expandedPackages.includes(pkg.id);

                  return (
                    <Card key={pkg.id} className="rounded-2xl overflow-hidden">
                      <Collapsible open={isExpanded} onOpenChange={() => togglePackageExpanded(pkg.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Folder className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="font-bold">{pkg.client_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(pkg.start_date), "dd MMM", { locale: el })} - {format(new Date(pkg.end_date), "dd MMM yyyy", { locale: el })}
                                  {" · "}{pkg.invoices.length} παραστατικά
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className={`font-bold ${pkgProfit >= 0 ? '' : 'text-red-600'}`}>€{pkgProfit.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Κέρδος</p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t">
                            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 text-sm">
                              <div>
                                <span className="text-muted-foreground">Έσοδα:</span>
                                <span className="ml-2 font-medium text-green-600">€{pkgIncome.toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Έξοδα:</span>
                                <span className="ml-2 font-medium text-red-600">€{pkgExpenses.toFixed(2)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-muted-foreground">Κέρδος:</span>
                                <span className={`ml-2 font-semibold ${pkgProfit >= 0 ? '' : 'text-red-600'}`}>€{pkgProfit.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="divide-y">
                              {pkg.invoices.map(inv => (
                                <div key={inv.id} className="flex justify-between items-center p-3 px-4 hover:bg-muted/20 transition-colors group">
                                  <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inv.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                      <span className="font-medium text-sm">{inv.merchant || inv.category}</span>
                                      <span className="text-xs text-gray-500 ml-3">{inv.invoice_date || "-"}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium">€{(inv.amount || 0).toFixed(2)}</span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {inv.file_path && !inv.file_path.startsWith('manual/') && (
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadInvoice(inv.file_path, inv.file_name || undefined)}>
                                          <Download className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                        const comment = prompt("Σχόλιο:");
                                        if (comment) postFeedback(inv.id, 'comment', comment);
                                      }}>
                                        <FileText className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => {
                                        if (confirm("Αμφισβήτηση;")) postFeedback(inv.id, 'doubt', 'Doubt');
                                      }}>
                                        <AlertCircle className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== INVOICE LIST TAB ===== */}
          <TabsContent value="invoices" className="space-y-6">
            {invoiceListImports.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Λίστα Παραστατικών Εσόδων
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      {invoiceListMatchedCount}/{invoiceListItemsCount} αντιστοιχισμένα
                    </span>
                    <span className="font-semibold">Σύνολο: €{invoiceListTotal.toFixed(2)}</span>
                  </div>
                </div>

                {invoiceListImports.map(imp => {
                  const isExpanded = expandedImports.includes(imp.id);
                  const matchedCount = imp.items?.filter(i => i.match_status === 'matched').length || 0;
                  const totalCount = imp.items?.length || 0;

                  return (
                    <Card key={imp.id} className="rounded-2xl overflow-hidden">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleImportExpanded(imp.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <FileSpreadsheet className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium">{imp.file_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {imp.upload_date ? format(new Date(imp.upload_date), "dd MMM yyyy", { locale: el }) : ""}
                                  {" · "}{totalCount} τιμολόγια
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant={imp.validated_totals ? "default" : "secondary"}>
                                {imp.validated_totals ? 'Επαληθευμένο' : 'Μη επαληθευμένο'}
                              </Badge>
                              <div className="text-right">
                                <p className="font-semibold">€{(imp.total_gross || 0).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {matchedCount}/{totalCount} matched
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadExcel(imp.file_path, imp.file_name);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t">
                            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 text-sm">
                              <div>
                                <span className="text-muted-foreground">Καθαρή Αξία:</span>
                                <span className="ml-2 font-medium">€{(imp.total_net || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Φ.Π.Α.:</span>
                                <span className="ml-2 font-medium">€{(imp.total_vat || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Σύνολο:</span>
                                <span className="ml-2 font-semibold">€{(imp.total_gross || 0).toFixed(2)}</span>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="gap-1">
                                  <Check className="h-3 w-3" />
                                  {matchedCount} αντιστοιχισμένα
                                </Badge>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                  <tr>
                                    <th className="text-left p-3 font-medium">Ημερομηνία</th>
                                    <th className="text-left p-3 font-medium">Παραστατικό</th>
                                    <th className="text-left p-3 font-medium">Πελάτης</th>
                                    <th className="text-left p-3 font-medium">Α.Φ.Μ.</th>
                                    <th className="text-right p-3 font-medium">Καθαρή</th>
                                    <th className="text-right p-3 font-medium">Φ.Π.Α.</th>
                                    <th className="text-right p-3 font-medium">Σύνολο</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {imp.items?.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/30">
                                      <td className="p-3">
                                        {item.invoice_date
                                          ? format(new Date(item.invoice_date), "dd/MM/yy", { locale: el })
                                          : "-"}
                                      </td>
                                      <td className="p-3">
                                        <p className="font-medium">{item.invoice_number || "-"}</p>
                                      </td>
                                      <td className="p-3 max-w-48 truncate" title={item.client_name || ""}>
                                        {item.client_name || "-"}
                                      </td>
                                      <td className="p-3 font-mono text-xs">
                                        {item.client_vat || "-"}
                                      </td>
                                      <td className="p-3 text-right tabular-nums">
                                        €{(item.net_amount || 0).toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                                        €{(item.vat_amount || 0).toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right tabular-nums font-semibold">
                                        €{(item.total_amount || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Δεν υπάρχουν λίστες παραστατικών</p>
              </div>
            )}
          </TabsContent>

          {/* ===== TRANSACTIONS TAB ===== */}
          <TabsContent value="transactions" className="space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Τραπεζικές Κινήσεις ({transactions.length})
            </h3>
            {transactions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Δεν υπάρχουν κινήσεις</p>
              </div>
            ) : (
              <Card className="rounded-2xl overflow-hidden divide-y">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex justify-between items-center p-4 text-sm hover:bg-muted/20 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-gray-500 text-xs">
                        {format(new Date(txn.transaction_date), "dd MMM yyyy", { locale: el })}
                      </p>
                    </div>
                    <span className="font-mono font-medium">
                      €{Math.abs(txn.amount).toFixed(2)}
                      <span className={`text-xs ml-1 ${txn.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {txn.amount >= 0 ? "CR" : "DR"}
                      </span>
                    </span>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="pt-12 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} TravelDocs. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
