import { useState, useEffect } from "react";
import { Send, Check, Archive, Link2, FileSpreadsheet, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, ExportLog, BankTransaction, InvoiceTransactionMatch } from "@/types/database";
import { toast } from "sonner";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMonth } from "@/contexts/MonthContext";

export default function ExportHub() {
  // Use global month context instead of local state
  const { monthKey: selectedMonth, displayLabel: currentMonthLabel } = useMonth();

  const [generalInvoices, setGeneralInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<(Package & { invoices: Invoice[] })[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<InvoiceTransactionMatch[]>([]);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSendDialog, setConfirmSendDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]); // Re-fetch when month changes

  async function fetchData() {
    const [{ data: pkgs }, { data: invs }, { data: logs }, { data: txns }, { data: matchData }] = await Promise.all([
      supabase.from("packages").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("export_logs").select("*").order("sent_at", { ascending: false }).limit(10),
      supabase.from("bank_transactions").select("*"),
      supabase.from("invoice_transaction_matches").select("*"),
    ]);

    const allInvoices = (invs as Invoice[]) || [];

    const packagesWithInvoices = ((pkgs as Package[]) || []).map((pkg) => ({
      ...pkg,
      invoices: allInvoices.filter((inv) => inv.package_id === pkg.id),
    }));

    setPackages(packagesWithInvoices);

    // Store general invoices (no package)
    setGeneralInvoices(allInvoices.filter(inv => !inv.package_id));

    setTransactions((txns as BankTransaction[]) || []);
    setMatches((matchData as InvoiceTransactionMatch[]) || []);
    setExportLogs((logs as ExportLog[]) || []);
    setLoading(false);
  }

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = format(new Date(pkg.start_date), "yyyy-MM");
    return pkgMonth === selectedMonth;
  });

  const filteredGeneralInvoices = generalInvoices.filter(inv => {
    const invDate = inv.invoice_date || inv.created_at;
    return format(new Date(invDate), "yyyy-MM") === selectedMonth;
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
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Monthly Report");

      worksheet.columns = [
        { header: "Package", key: "package", width: 25 },
        { header: "Merchant", key: "merchant", width: 30 },
        { header: "Category", key: "category", width: 15 },
        { header: "Invoice Date", key: "date", width: 15 },
        { header: "Amount (€)", key: "amount", width: 15 },
        { header: "VAT Amount (€)", key: "vat", width: 15 },
        { header: "Matched", key: "matched", width: 10 },
        { header: "Transaction Date", key: "txnDate", width: 15 },
        { header: "Transaction Amount (€)", key: "txnAmount", width: 20 },
        { header: "Transaction Description", key: "txnDesc", width: 40 },
      ];

      // Make header bold
      worksheet.getRow(1).font = { bold: true };

      let hasData = false;

      for (const pkg of filteredPackages) {
        for (const inv of pkg.invoices) {
          const matchedTxn = getMatchInfo(inv.id);
          const rawExtracted = inv.extracted_data as any;
          const extractedData = rawExtracted?.extracted || rawExtracted;
          hasData = true;

          worksheet.addRow({
            package: pkg.client_name,
            merchant: inv.merchant || "—",
            category: inv.category,
            date: inv.invoice_date || "—",
            amount: inv.amount?.toFixed(2) || "—",
            vat: extractedData?.vat_amount?.toFixed(2) || "—",
            matched: matchedTxn ? "Yes" : "No",
            txnDate: matchedTxn ? matchedTxn.transaction_date : "—",
            txnAmount: matchedTxn ? Math.abs(matchedTxn.amount).toFixed(2) : "—",
            txnDesc: matchedTxn ? matchedTxn.description : "—",
          });
        }
      }

      // Add General Invoices
      for (const inv of filteredGeneralInvoices) {
        const matchedTxn = getMatchInfo(inv.id);
        const rawExtracted = inv.extracted_data as any;
        const extractedData = rawExtracted?.extracted || rawExtracted;
        hasData = true;

        worksheet.addRow({
          package: "General / Independent",
          merchant: inv.merchant || "—",
          category: inv.category,
          date: inv.invoice_date || "—",
          amount: inv.amount?.toFixed(2) || "—",
          vat: extractedData?.vat_amount?.toFixed(2) || "—",
          matched: matchedTxn ? "Yes" : "No",
          txnDate: matchedTxn ? matchedTxn.transaction_date : "—",
          txnAmount: matchedTxn ? Math.abs(matchedTxn.amount).toFixed(2) : "—",
          txnDesc: matchedTxn ? matchedTxn.description : "—",
        });
      }

      if (!hasData) {
        toast.error("No invoices to export");
        setExportingXlsx(false);
        return;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
          index: fileIndex++,
          package: pkg.client_name,
          merchant: inv.merchant || "—",
          category: category,
          date: invoiceDate,
          amount: (inv.amount || 0).toFixed(2),
          filename: fileName,
        });
      }
    }

    // Add General Invoices to Zip
    for (const inv of filteredGeneralInvoices) {
      // Create descriptive filename: YYYY-MM-DD_Provider_Category_Amount.pdf
      const invoiceDate = inv.invoice_date || format(new Date(), "yyyy-MM-dd");
      const provider = (inv.merchant || "General").replace(/[/\\?%*:|"<>]/g, "-").substring(0, 30);
      const category = (inv.category || "other").toUpperCase();
      const amount = `${(inv.amount || 0).toFixed(2)}EUR`;
      const fileName = `General/${invoiceDate}_${provider}_${category}_${amount}.pdf`;

      try {
        const { data } = await supabase.storage.from("invoices").download(inv.file_path);
        if (data) {
          zip.file(fileName, data);
        } else {
          console.warn(`No file data for invoice ${inv.id}`);
        }
      } catch (error) {
        console.error(`Error downloading invoice ${inv.id}:`, error);
      }

      summaryData.push({
        index: fileIndex++,
        package: "General / Independent",
        merchant: inv.merchant || "—",
        category: category,
        date: invoiceDate,
        amount: (inv.amount || 0).toFixed(2),
        filename: fileName,
      });
    }

    // Add summary Excel file
    if (summaryData.length > 0) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Περιληψη");

      worksheet.columns = [
        { header: "Αρ.", key: "index", width: 6 },
        { header: "Πακέτο", key: "package", width: 25 },
        { header: "Προμηθευτής", key: "merchant", width: 30 },
        { header: "Κατηγορία", key: "category", width: 15 },
        { header: "Ημερομηνία", key: "date", width: 15 },
        { header: "Ποσό (€)", key: "amount", width: 15 },
        { header: "Όνομα Αρχείου", key: "filename", width: 60 },
      ];

      worksheet.getRow(1).font = { bold: true };

      summaryData.forEach(row => {
        worksheet.addRow(row);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      zip.file(`00_ΠΕΡΙΛΗΨΗ_${selectedMonth}.xlsx`, buffer);
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
      toast.error("Αποτυχία καταγραφής εξαγωγής. Παρακαλώ δοκιμάστε ξανά.");
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

  async function generateMagicLink() {
    try {
      // Generate unique token
      const token = crypto.randomUUID();

      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from("accountant_magic_links").insert([
        {
          token,
          month_year: selectedMonth,
          expires_at: expiresAt.toISOString(),
        },
      ]);

      if (error) {
        console.error("Magic link error:", error);
        toast.error("Failed to generate link");
        return;
      }

      // Generate the link
      const link = `${window.location.origin}/accountant/${token}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(link);

      toast.success("Magic link copied to clipboard! Valid for 7 days.");
    } catch (error) {
      console.error("Error generating magic link:", error);
      toast.error("Failed to generate magic link");
    }
  }

  const totalPackageInvoices = filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0);
  const totalGeneralInvoices = filteredGeneralInvoices.length;
  const totalInvoices = totalPackageInvoices + totalGeneralInvoices;

  const totalPackageAmount = filteredPackages.reduce((acc, p) => acc + p.invoices.reduce((a, i) => a + (i.amount || 0), 0), 0);
  const totalGeneralAmount = filteredGeneralInvoices.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalAmount = totalPackageAmount + totalGeneralAmount;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Export Hub</h1>
        <p className="mt-1 text-muted-foreground">
          Δημιουργία μηνιαίων αναφορών για τον λογιστή - <span className="font-medium capitalize">{currentMonthLabel}</span>
        </p>
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
          onClick={generateMagicLink}
          disabled={totalInvoices === 0}
          variant="outline"
          className="rounded-xl gap-2"
        >
          <Link2 className="h-4 w-4" />
          Magic Link (Λογιστή)
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

      {/* General Invoices List */}
      {filteredGeneralInvoices.length > 0 && (
        <Card className="rounded-3xl overflow-hidden mb-8 border-l-4 border-l-amber-500">
          <div className="p-4 border-b border-border bg-amber-50/30">
            <h3 className="font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Γενικά / Ανεξάρτητα ({filteredGeneralInvoices.length})
            </h3>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Γενικά Έξοδα & Έσοδα</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="rounded-lg border-amber-200 bg-amber-50 text-amber-700">
                  {filteredGeneralInvoices.length} invoices
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Εκτός ταξιδιωτικών φακέλων
                </span>
              </div>
            </div>
            <p className="text-lg font-semibold">€{filteredGeneralInvoices.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
          </div>
        </Card>
      )}

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
      ) : filteredGeneralInvoices.length === 0 ? (
        <div className="mb-8">
          <EmptyState
            icon={Archive}
            title="Δεν υπάρχουν δεδομένα"
            description={`Δεν υπάρχουν πακέτα ή γενικά έξοδα για ${currentMonthLabel}.`}
          />
        </div>
      ) : null}

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
