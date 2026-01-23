import { useState, useEffect, useRef } from "react";
import { Upload, Check, Download, FileSpreadsheet, HelpCircle, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BankTransaction, Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/shared/EmptyState";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  error?: string;
}

interface PDFExtractedRow {
  date: string;
  description: string;
  amount: number;
}

export default function BankSync() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF import state
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfExtractedRows, setPdfExtractedRows] = useState<PDFExtractedRow[]>([]);
  const [pdfImporting, setPdfImporting] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: txns }, { data: pkgs }, { data: invs }] = await Promise.all([
      supabase.from("bank_transactions").select("*").order("transaction_date", { ascending: false }),
      supabase.from("packages").select("*"),
      supabase.from("invoices").select("*"),
    ]);
    setTransactions((txns as BankTransaction[]) || []);
    setPackages((pkgs as Package[]) || []);
    setInvoices(((invs as any[]) || []) as Invoice[]);
    setLoading(false);
  }

  function downloadSampleCSV() {
    const sample = `date,description,amount
2024-01-15,AEGEAN AIRLINES SA,245.50
2024-01-16,BOOKING.COM HOTEL,189.00
2024-01-17,ATTIKI ODOS TOLLS,12.80`;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sample CSV downloaded");
  }

  function parseAmount(amountStr: string): number | null {
    if (!amountStr || typeof amountStr !== "string") return null;

    // Remove currency symbols and whitespace
    let cleaned = amountStr.replace(/[€$£\s]/g, "").trim();

    // Handle European format (1.234,56) vs US format (1,234.56)
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");

    if (lastComma > lastPeriod) {
      // European format: remove periods (thousands), replace comma with period
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US format or simple: just remove commas
      cleaned = cleaned.replace(/,/g, "");
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];

        // Check for required headers
        if (rows.length === 0) {
          toast.error("CSV file is empty");
          return;
        }

        const firstRow = rows[0];
        const headers = Object.keys(firstRow).map(h => h.toLowerCase().trim());

        const hasDate = headers.includes("date");
        const hasDescription = headers.includes("description");
        const hasAmount = headers.includes("amount");

        if (!hasDate || !hasDescription || !hasAmount) {
          const missing = [];
          if (!hasDate) missing.push("date");
          if (!hasDescription) missing.push("description");
          if (!hasAmount) missing.push("amount");

          toast.error(`Missing required columns: ${missing.join(", ")}. CSV must have: date, description, amount`);
          return;
        }

        const parsed: ParsedTransaction[] = [];
        const errors: string[] = [];

        rows.forEach((r, idx) => {
          // Find columns case-insensitively
          const dateKey = Object.keys(r).find(k => k.toLowerCase().trim() === "date");
          const descKey = Object.keys(r).find(k => k.toLowerCase().trim() === "description");
          const amountKey = Object.keys(r).find(k => k.toLowerCase().trim() === "amount");

          const date = dateKey ? r[dateKey]?.trim() : "";
          const description = descKey ? r[descKey]?.trim() : "";
          const amountStr = amountKey ? r[amountKey] : "";
          const amount = parseAmount(amountStr);

          if (!date || !description) {
            errors.push(`Row ${idx + 2}: Missing date or description`);
            return;
          }

          if (amount === null) {
            errors.push(`Row ${idx + 2}: Invalid amount "${amountStr}"`);
            return;
          }

          parsed.push({ date, description, amount });
        });

        if (parsed.length === 0) {
          toast.error(`No valid rows found. ${errors.length} errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`);
          return;
        }

        const toInsert = parsed.map((r) => ({
          transaction_date: r.date,
          description: r.description,
          amount: r.amount,
        }));

        const { error } = await supabase.from("bank_transactions").insert(toInsert);
        if (error) {
          console.error("Insert error:", error);
          toast.error(`Failed to import: ${error.message}`);
        } else {
          const successMsg = `Imported ${toInsert.length} transactions`;
          const errorSuffix = errors.length > 0 ? ` (${errors.length} rows skipped due to errors)` : "";
          toast.success(successMsg + errorSuffix);
          fetchData();
        }
      },
      error: (err) => {
        console.error("Parse error:", err);
        toast.error(`Failed to parse CSV: ${err.message}`);
      }
    });

    // Reset input
    e.target.value = "";
  }

  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfDialogOpen(true);
    setPdfExtracting(true);
    setPdfExtractedRows([]);

    try {
      // Upload PDF to bank-statements bucket
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const filePath = `statements/${uniqueId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("bank-statements")
        .upload(filePath, file);

      if (uploadError) {
        console.error("PDF upload error:", uploadError);
        toast.error(`Failed to upload PDF: ${uploadError.message}`);
        setPdfExtracting(false);
        return;
      }

      // Call extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-bank-pdf", {
        body: { filePath, fileName: file.name }
      });

      if (error) {
        console.error("PDF extraction error:", error);
        toast.error("Failed to extract transactions from PDF");
        setPdfExtracting(false);
        return;
      }

      if (data?.transactions && Array.isArray(data.transactions)) {
        setPdfExtractedRows(data.transactions);
        if (data.transactions.length === 0) {
          toast.warning("No transactions found in PDF");
        }
      } else {
        toast.warning("No transactions could be extracted");
      }
    } catch (err) {
      console.error("PDF processing error:", err);
      toast.error("Failed to process PDF");
    }

    setPdfExtracting(false);
    e.target.value = "";
  }

  async function importPDFTransactions() {
    if (pdfExtractedRows.length === 0) return;

    setPdfImporting(true);

    const toInsert = pdfExtractedRows.map(r => ({
      transaction_date: r.date,
      description: r.description,
      amount: r.amount,
    }));

    const { error } = await supabase.from("bank_transactions").insert(toInsert);

    if (error) {
      console.error("Import error:", error);
      toast.error(`Failed to import: ${error.message}`);
    } else {
      toast.success(`Imported ${toInsert.length} transactions`);
      setPdfDialogOpen(false);
      setPdfExtractedRows([]);
      fetchData();
    }

    setPdfImporting(false);
  }

  async function linkToPackage(txnId: string, packageId: string | null) {
    const { error } = await supabase.from("bank_transactions").update({ package_id: packageId }).eq("id", txnId);
    if (error) {
      toast.error(`Failed to link: ${error.message}`);
      return;
    }
    toast.success("Transaction linked");
    fetchData();
  }

  async function toggleNeedsInvoice(txn: BankTransaction) {
    await supabase.from("bank_transactions").update({ needs_invoice: !txn.needs_invoice }).eq("id", txn.id);
    fetchData();
  }

  const findMatchingInvoice = (txn: BankTransaction) => {
    return invoices.find((inv) => inv.amount && Math.abs(inv.amount - txn.amount) <= 1);
  };

  const getMatchConfidence = (txn: BankTransaction, inv: Invoice): "high" | "medium" | "low" => {
    const amountDiff = Math.abs((inv.amount || 0) - txn.amount);
    if (amountDiff < 0.01) return "high";
    if (amountDiff <= 1) return "medium";
    return "low";
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Συγχρονισμός Τράπεζας</h1>
          <p className="mt-1 text-muted-foreground">Εισαγωγή και αντιστοίχιση τραπεζικών κινήσεων</p>
        </div>
        <div className="flex gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={downloadSampleCSV} className="rounded-xl gap-2">
                <Download className="h-4 w-4" />
                Δείγμα CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Κατεβάστε δείγμα αρχείου CSV με τη σωστή μορφή</TooltipContent>
          </Tooltip>

          <div>
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload">
              <Button asChild className="rounded-xl cursor-pointer gap-2">
                <span>
                  <Upload className="h-4 w-4" />
                  Εισαγωγή CSV
                </span>
              </Button>
            </label>
          </div>

          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              className="hidden"
              id="pdf-upload"
              ref={pdfInputRef}
            />
            <label htmlFor="pdf-upload">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="outline" className="rounded-xl cursor-pointer gap-2">
                    <span>
                      <FileText className="h-4 w-4" />
                      PDF (beta)
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Μεταφόρτωση PDF τράπεζας - Beta λειτουργία</TooltipContent>
              </Tooltip>
            </label>
          </div>
        </div>
      </div>

      {/* Instructions Card */}
      <Card className="mb-6 rounded-2xl border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">Οδηγίες Εισαγωγής</p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Το CSV πρέπει να περιέχει τις στήλες: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">date</code>,{" "}
              <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">description</code>,{" "}
              <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">amount</code>. Κατεβάστε το sample για παράδειγμα.
            </p>
          </div>
        </div>
      </Card>

      {transactions.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Δεν υπάρχουν κινήσεις"
          description="Εισάγετε ένα αρχείο CSV ή PDF με τις τραπεζικές σας κινήσεις για να ξεκινήσετε την αντιστοίχιση με παραστατικά."
          actionLabel="Λήψη Δείγματος CSV"
          onAction={downloadSampleCSV}
        />
      ) : (
        <Card className="rounded-3xl overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.map((txn, i) => {
              const match = findMatchingInvoice(txn);
              const linkedPkg = packages.find((p) => p.id === txn.package_id);
              const confidence = match ? getMatchConfidence(txn, match) : null;

              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={cn(
                    "flex items-center gap-4 p-4 transition-colors",
                    match && "bg-green-50/70 dark:bg-green-950/20"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{txn.description}</p>
                      {txn.needs_invoice && (
                        <Badge variant="outline" className="rounded-lg bg-amber-50 text-amber-700 border-amber-200">
                          Λείπει Τιμολόγιο
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{format(new Date(txn.transaction_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("font-semibold text-lg", txn.amount < 0 ? "text-destructive" : "")}>
                      €{Math.abs(txn.amount).toFixed(2)}
                    </p>
                    {match && (
                      <p className="text-xs text-green-600 flex items-center justify-end gap-1">
                        <Check className="h-3 w-3" />
                        Ταίριασμα
                      </p>
                    )}
                  </div>
                  <Select value={txn.package_id || "none"} onValueChange={(v) => linkToPackage(txn.id, v === "none" ? null : v)}>
                    <SelectTrigger className="w-40 rounded-xl">
                      <SelectValue placeholder="Σύνδεση με..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Καμία σύνδεση</SelectItem>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={txn.needs_invoice} onCheckedChange={() => toggleNeedsInvoice(txn)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Τιμολόγιο;</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      {/* PDF Extraction Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Εισαγωγή PDF Τράπεζας (Beta)
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <AlertTriangle className="h-4 w-4" />
                Beta λειτουργία - Αυτόματη Αναγνώριση
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Η AI προσπαθεί να αναγνωρίσει ημερομηνίες και ποσά από το PDF της τράπεζας.
                <span className="text-amber-700 font-bold"> Παρακαλούμε ελέγξτε προσεκτικά τον παρακάτω πίνακα </span>
                πριν πατήσετε "Εισαγωγή", καθώς ενδέχεται να υπάρξουν σφάλματα αναγνώρισης.
              </p>
            </DialogDescription>
          </DialogHeader>

          {pdfExtracting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Εξαγωγή κινήσεων από PDF...</p>
            </div>
          ) : pdfExtractedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <p className="text-muted-foreground">Δεν βρέθηκαν κινήσεις στο PDF.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Ημερομηνία</th>
                    <th className="text-left p-3 font-medium">Περιγραφή</th>
                    <th className="text-right p-3 font-medium">Ποσό</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pdfExtractedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-3">{row.date}</td>
                      <td className="p-3 truncate max-w-xs">{row.description}</td>
                      <td className="p-3 text-right font-medium">€{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)} className="rounded-xl">
              Ακύρωση
            </Button>
            <Button
              onClick={importPDFTransactions}
              disabled={pdfExtractedRows.length === 0 || pdfImporting}
              className="rounded-xl gap-2"
            >
              {pdfImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Εισαγωγή...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Εισαγωγή {pdfExtractedRows.length} Κινήσεων
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
