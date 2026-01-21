import { useState, useEffect } from "react";
import { Send, Check, Archive, Link2, FileSpreadsheet, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, ExportLog, BankTransaction, InvoiceTransactionMatch } from "@/types/database";
import { toast } from "sonner";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";

export default function ExportHub() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [packages, setPackages] = useState<(Package & { invoices: Invoice[] })[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<InvoiceTransactionMatch[]>([]);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmSendDialog, setConfirmSendDialog] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: pkgs }, { data: invs }, { data: logs }, { data: txns }, { data: matchData }] = await Promise.all([
      supabase.from("packages").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("export_logs").select("*").order("sent_at", { ascending: false }).limit(10),
      supabase.from("bank_transactions").select("*"),
      supabase.from("invoice_transaction_matches").select("*"),
    ]);

    const packagesWithInvoices = ((pkgs as Package[]) || []).map((pkg) => ({
      ...pkg,
      invoices: ((invs as Invoice[]) || []).filter((inv) => inv.package_id === pkg.id),
    }));

    setPackages(packagesWithInvoices);
    setTransactions((txns as BankTransaction[]) || []);
    setMatches((matchData as InvoiceTransactionMatch[]) || []);
    setExportLogs((logs as ExportLog[]) || []);
    setLoading(false);
  }

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = format(new Date(pkg.start_date), "yyyy-MM");
    return pkgMonth === selectedMonth;
  });

  // Get match info for an invoice
  function getMatchInfo(invoiceId: string) {
    const match = matches.find(m => m.invoice_id === invoiceId);
    if (!match) return null;
    const transaction = transactions.find(t => t.id === match.transaction_id);
    return transaction;
  }

  async function generateXlsx() {
    setExportingXlsx(true);

    try {
      const summaryData: any[] = [];

      for (const pkg of filteredPackages) {
        for (const inv of pkg.invoices) {
          const matchedTxn = getMatchInfo(inv.id);
          const extractedData = inv.extracted_data as any;

          summaryData.push({
            "Package": pkg.client_name,
            "Merchant": inv.merchant || "—",
            "Category": inv.category,
            "Invoice Date": inv.invoice_date || "—",
            "Amount (€)": inv.amount?.toFixed(2) || "—",
            "VAT Amount (€)": extractedData?.vat_amount?.toFixed(2) || "—",
            "Matched": matchedTxn ? "Yes" : "No",
            "Transaction Date": matchedTxn ? matchedTxn.transaction_date : "—",
            "Transaction Amount (€)": matchedTxn ? Math.abs(matchedTxn.amount).toFixed(2) : "—",
            "Transaction Description": matchedTxn ? matchedTxn.description : "—",
          });
        }
      }

      if (summaryData.length === 0) {
        toast.error("No invoices to export");
        setExportingXlsx(false);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(summaryData);

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Package
        { wch: 25 }, // Merchant
        { wch: 12 }, // Category
        { wch: 12 }, // Invoice Date
        { wch: 12 }, // Amount
        { wch: 12 }, // VAT
        { wch: 8 },  // Matched
        { wch: 12 }, // Txn Date
        { wch: 12 }, // Txn Amount
        { wch: 30 }, // Txn Description
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `TravelDocs-${selectedMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("XLSX report downloaded!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate report");
    }

    setExportingXlsx(false);
  }

  async function generateZip() {
    setExporting(true);
    const zip = new JSZip();

    const summaryData: any[] = [];
    let fileIndex = 1;

    for (const pkg of filteredPackages) {
      for (const inv of pkg.invoices) {
        // Create descriptive filename: YYYY-MM-DD_Provider_Category_Amount.pdf
        const invoiceDate = inv.invoice_date || format(new Date(), "yyyy-MM-dd");
        const provider = (inv.merchant || pkg.client_name || "Unknown").replace(/[/\\?%*:|"<>]/g, "-").substring(0, 30);
        const category = (inv.category || "other").toUpperCase();
        const amount = `${(inv.amount || 0).toFixed(2)}EUR`;
        const fileName = `${invoiceDate}_${provider}_${category}_${amount}.pdf`;

        try {
          const { data } = await supabase.storage.from("invoices").download(inv.file_path);
          if (data) {
            zip.file(fileName, data);
          } else {
            console.warn(`No file data for invoice ${inv.id}`);
          }
        } catch (error) {
          console.error(`Error downloading invoice ${inv.id}:`, error);
          // Continue with other files
        }

        summaryData.push({
          "Αρ.": fileIndex++,
          "Πακέτο": pkg.client_name,
          "Προμηθευτής": inv.merchant || "—",
          "Κατηγορία": category,
          "Ημερομηνία": invoiceDate,
          "Ποσό (€)": (inv.amount || 0).toFixed(2),
          "Όνομα Αρχείου": fileName,
        });
      }
    }

    // Add summary Excel file
    if (summaryData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(summaryData);
      ws['!cols'] = [
        { wch: 5 },  // Αρ.
        { wch: 20 }, // Πακέτο
        { wch: 25 }, // Προμηθευτής
        { wch: 12 }, // Κατηγορία
        { wch: 12 }, // Ημερομηνία
        { wch: 12 }, // Ποσό
        { wch: 60 }, // Όνομα Αρχείου
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Περιληψη");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      zip.file(`00_ΠΕΡΙΛΗΨΗ_${selectedMonth}.xlsx`, excelBuffer);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TravelDocs_${selectedMonth}_${filteredPackages.length}packages_${summaryData.length}invoices.zip`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    toast.success(`Εξαγωγή ολοκληρώθηκε! ${summaryData.length} αρχεία.`);
  }

  async function sendToAccountant() {
    setSending(true);

    const { error } = await supabase.from("export_logs").insert([
      {
        month_year: selectedMonth,
        packages_included: filteredPackages.length,
        invoices_included: filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0),
      },
    ]);

    if (error) {
      console.error("Export log error:", error);
      toast.error(`Failed to log export: ${error.message}`);
      setSending(false);
      return;
    }

    setSending(false);
    setConfirmSendDialog(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    fetchData();
    toast.success("Marked as sent!");
  }

  const totalInvoices = filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0);
  const totalAmount = filteredPackages.reduce((acc, p) => acc + p.invoices.reduce((a, i) => a + (i.amount || 0), 0), 0);
  const currentMonthLabel = months.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Export Hub</h1>
          <p className="mt-1 text-muted-foreground">Δημιουργία μηνιαίων αναφορών για τον λογιστή</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="p-6 rounded-3xl">
          <p className="text-sm font-medium text-muted-foreground">Πακέτα</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{filteredPackages.length}</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-sm font-medium text-muted-foreground">Παραστατικά</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{totalInvoices}</p>
        </Card>
        <Card className="p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-sm font-medium text-muted-foreground">Σύνολο</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-primary">€{totalAmount.toFixed(2)}</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          onClick={generateXlsx}
          disabled={exportingXlsx || totalInvoices === 0}
          className="rounded-xl gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {exportingXlsx ? "Generating..." : "Download XLSX Report"}
        </Button>
        <Button
          onClick={generateZip}
          disabled={exporting || totalInvoices === 0}
          variant="outline"
          className="rounded-xl gap-2"
        >
          <Archive className="h-4 w-4" />
          {exporting ? "Generating..." : "Download ZIP + Excel"}
        </Button>
        <Button
          disabled
          variant="outline"
          className="rounded-xl gap-2 opacity-50 cursor-not-allowed"
          title="Σύντομα διαθέσιμο"
        >
          <Link2 className="h-4 w-4" />
          Magic Link (σύντομα)
        </Button>
        <Button
          onClick={() => setConfirmSendDialog(true)}
          disabled={sending || totalInvoices === 0}
          variant="outline"
          className="rounded-xl relative overflow-hidden gap-2"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.span
                key="success"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center text-green-600"
              >
                <Check className="h-4 w-4 mr-2" /> Sent!
              </motion.span>
            ) : (
              <motion.span
                key="send"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center"
              >
                <Send className="h-4 w-4 mr-2" /> Mark as Sent
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Packages List */}
      {filteredPackages.length > 0 ? (
        <Card className="rounded-3xl overflow-hidden mb-8">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold">Πακέτα για {currentMonthLabel}</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredPackages.map((pkg) => (
              <div key={pkg.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{pkg.client_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-lg">
                      {pkg.invoices.length} invoices
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(pkg.start_date), "dd MMM")} - {format(new Date(pkg.end_date), "dd MMM")}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-semibold">€{pkg.invoices.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="mb-8">
          <EmptyState
            icon={Archive}
            title="Δεν υπάρχουν πακέτα"
            description={`Δεν υπάρχουν πακέτα για ${currentMonthLabel}. Επιλέξτε διαφορετικό μήνα ή δημιουργήστε νέα πακέτα.`}
          />
        </div>
      )}

      {/* Export History */}
      <Card className="rounded-3xl">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Ιστορικό Εξαγωγών</h3>
        </div>
        {exportLogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Δεν υπάρχουν εξαγωγές ακόμα</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {exportLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                <Badge variant="outline" className="rounded-lg">
                  {log.month_year}
                </Badge>
                <span className="text-muted-foreground">
                  {log.packages_included} packages, {log.invoices_included} invoices
                </span>
                <span className="text-muted-foreground">{format(new Date(log.sent_at), "dd MMM yyyy, HH:mm")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirm Send Dialog */}
      <AlertDialog open={confirmSendDialog} onOpenChange={setConfirmSendDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Επιβεβαίωση Αποστολής</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να σημειώσετε την αναφορά για <strong>{currentMonthLabel}</strong> ως απεσταλμένη;
              <br /><br />
              Αυτό θα καταγράψει: {filteredPackages.length} πακέτα με {totalInvoices} παραστατικά.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Άκυρο</AlertDialogCancel>
            <AlertDialogAction onClick={sendToAccountant} className="rounded-xl">
              {sending ? "Καταγράφεται..." : "Επιβεβαίωση"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
