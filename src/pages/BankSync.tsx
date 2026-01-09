import { useState, useEffect } from "react";
import { Upload, Link2, Check, Download, FileSpreadsheet, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { BankTransaction, Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/shared/EmptyState";

export default function BankSync() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

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
    setInvoices((invs as Invoice[]) || []);
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

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const validRows = rows.filter((r) => r.date && r.description && r.amount);

        const toInsert = validRows.map((r) => ({
          transaction_date: r.date,
          description: r.description,
          amount: parseFloat(r.amount.replace(/[€$,]/g, "")),
        }));

        if (toInsert.length === 0) {
          toast.error("No valid rows found. Expected columns: date, description, amount");
          return;
        }

        const { error } = await supabase.from("bank_transactions").insert(toInsert);
        if (error) {
          toast.error("Failed to import transactions");
        } else {
          toast.success(`Imported ${toInsert.length} transactions`);
          fetchData();
        }
      },
    });
  }

  async function linkToPackage(txnId: string, packageId: string | null) {
    await supabase.from("bank_transactions").update({ package_id: packageId }).eq("id", txnId);
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
          <h1 className="text-3xl font-semibold tracking-tight">Bank Sync</h1>
          <p className="mt-1 text-muted-foreground">Εισαγωγή και αντιστοίχιση τραπεζικών κινήσεων</p>
        </div>
        <div className="flex gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={downloadSampleCSV} className="rounded-xl gap-2">
                <Download className="h-4 w-4" />
                Sample CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download a sample CSV file with the correct format</TooltipContent>
          </Tooltip>
          <div>
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload">
              <Button asChild className="rounded-xl cursor-pointer gap-2">
                <span>
                  <Upload className="h-4 w-4" />
                  Import CSV
                </span>
              </Button>
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
          description="Εισάγετε ένα αρχείο CSV με τις τραπεζικές σας κινήσεις για να ξεκινήσετε την αντιστοίχιση με παραστατικά."
          actionLabel="Download Sample"
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
                          Needs Invoice
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{format(new Date(txn.transaction_date), "dd MMM yyyy")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("font-semibold text-lg", txn.amount < 0 ? "text-destructive" : "")}>
                      €{Math.abs(txn.amount).toFixed(2)}
                    </p>
                    {match && (
                      <p className="text-xs text-green-600 flex items-center justify-end gap-1">
                        <Check className="h-3 w-3" />
                        {confidence === "high" ? "Exact match" : "Close match"}
                      </p>
                    )}
                  </div>
                  <Select value={txn.package_id || "none"} onValueChange={(v) => linkToPackage(txn.id, v === "none" ? null : v)}>
                    <SelectTrigger className="w-40 rounded-xl">
                      <SelectValue placeholder="Link to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No link</SelectItem>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={txn.needs_invoice} onCheckedChange={() => toggleNeedsInvoice(txn)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Invoice</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
