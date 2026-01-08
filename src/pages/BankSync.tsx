import { useState, useEffect } from "react";
import { Upload, Link2, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BankTransaction, Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const validRows = rows.filter(r => r.date && r.description && r.amount);
        
        const toInsert = validRows.map(r => ({
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
    return invoices.find(inv => inv.amount && Math.abs(inv.amount - txn.amount) < 0.01);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Bank Sync</h1>
          <p className="mt-1 text-muted-foreground">Import and match bank transactions</p>
        </div>
        <div>
          <Input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload">
            <Button asChild className="rounded-xl cursor-pointer">
              <span><Upload className="h-4 w-4 mr-2" />Import CSV</span>
            </Button>
          </label>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 rounded-3xl border-dashed">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Upload a CSV with columns: date, description, amount</p>
        </Card>
      ) : (
        <Card className="rounded-3xl overflow-hidden">
          <div className="divide-y divide-border">
            {transactions.map((txn) => {
              const match = findMatchingInvoice(txn);
              const linkedPkg = packages.find(p => p.id === txn.package_id);
              
              return (
                <div key={txn.id} className={cn("flex items-center gap-4 p-4", match && "bg-green-50 dark:bg-green-950/20")}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.description}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(txn.transaction_date), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-semibold", txn.amount < 0 ? "text-destructive" : "")}>
                      €{Math.abs(txn.amount).toFixed(2)}
                    </p>
                    {match && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Matches invoice
                      </p>
                    )}
                  </div>
                  <Select value={txn.package_id || "none"} onValueChange={(v) => linkToPackage(txn.id, v === "none" ? null : v)}>
                    <SelectTrigger className="w-40 rounded-xl">
                      <SelectValue placeholder="Link to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No link</SelectItem>
                      {packages.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={txn.needs_invoice} onCheckedChange={() => toggleNeedsInvoice(txn)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Needs Invoice</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
