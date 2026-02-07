import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Package, Invoice, BankTransaction } from "@/types/database";
import { FileText, CreditCard, AlertCircle, FileSpreadsheet, Check, X, Link2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

  const toggleImportExpanded = (importId: string) => {
    setExpandedImports(prev => 
      prev.includes(importId) 
        ? prev.filter(id => id !== importId)
        : [...prev, importId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
            <Check className="h-3 w-3" />
            Αντιστοιχισμένο
          </Badge>
        );
      case 'suggested':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
            <Link2 className="h-3 w-3" />
            Προτεινόμενο
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <X className="h-3 w-3" />
            Ανοιχτό
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Φόρτωση...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-12 max-w-md text-center rounded-xl border-gray-200 shadow-sm">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Μη Έγκυρος Σύνδεσμος</h2>
          <p className="text-muted-foreground">
            Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Παρακαλώ ζητήστε νέο σύνδεσμο από το γραφείο.
          </p>
        </Card>
      </div>
    );
  }

  const generalIncomeTotal = generalInvoices
    .filter(i => (i.type || 'expense') === 'income')
    .reduce((s, i) => s + (i.amount || 0), 0);

  const generalExpensesTotal = generalInvoices
    .filter(i => (i.type || 'expense') === 'expense')
    .reduce((s, i) => s + (i.amount || 0), 0);

  const totalIncome = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0),
    0
  ) + generalIncomeTotal;

  const totalExpenses = packages.reduce(
    (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0),
    0
  ) + generalExpensesTotal;

  const profit = totalIncome - totalExpenses;

  const generalIncomeInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'income');
  const generalExpenseInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'expense');

  // Invoice list totals
  const invoiceListTotal = invoiceListImports.reduce((sum, imp) => sum + (imp.total_gross || 0), 0);
  const invoiceListItemsCount = invoiceListImports.reduce((sum, imp) => sum + (imp.items?.length || 0), 0);
  const invoiceListMatchedCount = invoiceListImports.reduce((sum, imp) => 
    sum + (imp.items?.filter(i => i.match_status === 'matched').length || 0), 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6">
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
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εσοδα</p>
            <p className="text-3xl font-light mt-1">€{totalIncome.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εξοδα</p>
            <p className="text-3xl font-light mt-1">€{totalExpenses.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Καθαρο Κερδος</p>
            <p className={`text-3xl font-medium mt-1 ${profit >= 0 ? "text-gray-900" : "text-red-600"}`}>
              €{profit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Invoice List Section */}
        {invoiceListImports.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Λίστα Παραστατικών Εσόδων
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {invoiceListMatchedCount}/{invoiceListItemsCount} αντιστοιχισμένα
                </span>
                <span className="font-semibold">
                  Σύνολο: €{invoiceListTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {invoiceListImports.map((imp) => {
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
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t">
                          {/* Summary row */}
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

                          {/* Items table */}
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
                                  <th className="text-center p-3 font-medium">Κατάσταση</th>
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
                                      <div>
                                        <p className="font-medium">{item.invoice_number || "-"}</p>
                                        {item.mydata_code && (
                                          <p className="text-xs text-muted-foreground">{item.mydata_code}</p>
                                        )}
                                      </div>
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
                                    <td className="p-3 text-center">
                                      {getStatusBadge(item.match_status)}
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
          </div>
        )}

        {/* General/Unassigned Section */}
        {(generalIncomeInvoices.length > 0 || generalExpenseInvoices.length > 0) && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* General Income */}
            <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
              <div className="p-6 bg-gradient-to-r from-emerald-500 to-green-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Γενικά Έσοδα
                </h2>
                <p className="text-white/80 text-sm mt-1">Εκτός Πακέτων</p>
              </div>
              <div className="p-6 space-y-3">
                {generalIncomeInvoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                    <div>
                      <p className="font-medium text-sm">{inv.merchant || 'Άγνωστο'}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_date}</p>
                    </div>
                    <span className="font-bold text-green-600">€{(inv.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                {generalIncomeInvoices.length === 0 && <p className="text-sm text-muted-foreground italic">Κανένα γενικό έσοδο</p>}
              </div>
            </Card>

            {/* General Expenses */}
            <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
              <div className="p-6 bg-gradient-to-r from-rose-500 to-red-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Γενικά Έξοδα
                </h2>
                <p className="text-white/80 text-sm mt-1">Λειτουργικά & Άλλα</p>
              </div>
              <div className="p-6 space-y-3">
                {generalExpenseInvoices.map(inv => (
                  <div key={inv.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                    <div>
                      <p className="font-medium text-sm">{inv.merchant || inv.category}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_date}</p>
                    </div>
                    <span className="font-bold text-red-600">€{(inv.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
                {generalExpenseInvoices.length === 0 && <p className="text-sm text-muted-foreground italic">Κανένα γενικό έξοδο</p>}
              </div>
            </Card>
          </div>
        )}

        {/* Packages */}
        <div className="space-y-8">
          <h2 className="text-xl font-bold border-b pb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Πακέτα & Κινήσεις
          </h2>

          {packages.length === 0 ? (
            <p className="text-muted-foreground italic">Δεν υπάρχουν πακέτα για αυτόν τον μήνα.</p>
          ) : (
            <div className="grid gap-8">
              {packages.map((pkg) => {
                const pkgIncome = pkg.invoices.filter(i => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0);
                const pkgExpenses = pkg.invoices.filter(i => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0);
                const pkgProfit = pkgIncome - pkgExpenses;

                return (
                  <div key={pkg.id} className="border rounded-xl p-6 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-bold text-lg">{pkg.client_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(pkg.start_date), "dd MMM", { locale: el })} - {format(new Date(pkg.end_date), "dd MMM yyyy", { locale: el })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold">€{pkgProfit.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Κέρδος</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {pkg.invoices.map((inv) => (
                        <div key={inv.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded px-2 -mx-2 group">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${inv.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="font-medium text-sm">{inv.merchant || inv.category}</span>
                            </div>
                            <span className="text-xs text-gray-500 pl-4">{inv.invoice_date || "-"}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">€{(inv.amount || 0).toFixed(2)}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                const comment = prompt("Σχόλιο:");
                                if (comment) postFeedback(inv.id, 'comment', comment);
                              }}>
                                <FileText className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => {
                                if (confirm("Αμφισβήτηση?")) postFeedback(inv.id, 'doubt', 'Doubt');
                              }}>
                                <AlertCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pkg.invoices.length === 0 && <p className="text-sm text-muted-foreground">Κανένα παραστατικό</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bank Transactions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Τραπεζικές Κινήσεις ({transactions.length})
          </h2>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground italic">Δεν υπάρχουν κινήσεις.</p>
          ) : (
            <div className="border rounded-xl divide-y">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex justify-between items-center p-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium">{txn.description}</p>
                    <p className="text-gray-500 text-xs">{format(new Date(txn.transaction_date), "dd MMM yyyy", { locale: el })}</p>
                  </div>
                  <span className={`font-mono font-medium ${txn.amount >= 0 ? "text-gray-900" : "text-gray-900"}`}>
                    €{Math.abs(txn.amount).toFixed(2)}
                    <span className="text-xs text-gray-400 ml-1">{txn.amount >= 0 ? "CR" : "DR"}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-12 text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} TravelDocs. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
