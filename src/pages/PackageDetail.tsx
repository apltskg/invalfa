import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CreditCard, CheckCircle2, AlertCircle, Link2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, BankTransaction } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type InvoiceWithMatch = Invoice & { matchedTransaction?: BankTransaction };

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithMatch[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    const [{ data: pkgData }, { data: invData }, { data: txnData }] = await Promise.all([
      supabase.from("packages").select("*").eq("id", id).single(),
      supabase.from("invoices").select("*").eq("package_id", id),
      supabase.from("bank_transactions").select("*").eq("package_id", id),
    ]);

    setPkg(pkgData as Package | null);
    
    // Match invoices with transactions
    const invoicesWithMatches = ((invData as Invoice[]) || []).map((inv) => {
      const match = (txnData as BankTransaction[] || []).find(
        (txn) => inv.amount && Math.abs(txn.amount - inv.amount) <= 1
      );
      return { ...inv, matchedTransaction: match };
    });
    
    setInvoices(invoicesWithMatches);
    setTransactions((txnData as BankTransaction[]) || []);
    setLoading(false);
  }

  async function linkTransactionToInvoice(transactionId: string) {
    if (!id) return;
    
    await supabase.from("bank_transactions").update({ package_id: id }).eq("id", transactionId);
    toast.success("Η κίνηση συνδέθηκε");
    fetchData();
  }

  const unlinkedTransactions = transactions.filter((txn) => {
    const hasMatch = invoices.some(
      (inv) => inv.amount && Math.abs(txn.amount - inv.amount) <= 1
    );
    return !hasMatch;
  });

  const suggestedMatches = transactions.filter((txn) => {
    return invoices.some(
      (inv) => inv.amount && Math.abs(txn.amount - inv.amount) <= 1 && !inv.matchedTransaction
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-muted" />
          <div className="h-96 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <Card className="flex flex-col items-center justify-center rounded-3xl p-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Το πακέτο δεν βρέθηκε</p>
        <Button onClick={() => navigate("/packages")} variant="outline" className="mt-4 rounded-xl">
          Επιστροφή
        </Button>
      </Card>
    );
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const matchedCount = invoices.filter((inv) => inv.matchedTransaction).length;
  const matchPercent = invoices.length > 0 ? Math.round((matchedCount / invoices.length) * 100) : 0;

  const getStatusBadge = (inv: InvoiceWithMatch) => {
    if (inv.matchedTransaction) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-lg">Matched</Badge>;
    }
    if (inv.amount) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-lg">Needs Review</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-lg">Extracted</Badge>;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate("/packages")} className="mb-4 -ml-2 rounded-xl gap-2">
          <ArrowLeft className="h-4 w-4" />
          Πίσω στα Πακέτα
        </Button>
        
        <Card className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="mb-2 rounded-lg capitalize">
                {pkg.status === "active" ? "Ενεργό" : "Ολοκληρώθηκε"}
              </Badge>
              <h1 className="text-2xl font-semibold">{pkg.client_name}</h1>
              <p className="mt-1 text-muted-foreground">
                {format(new Date(pkg.start_date), "dd MMM")} - {format(new Date(pkg.end_date), "dd MMM yyyy")}
              </p>
            </div>
            
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Παραστατικά</p>
                <p className="text-2xl font-semibold">{invoices.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Σύνολο</p>
                <p className="text-2xl font-semibold">€{totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Matched</p>
                <p className="text-2xl font-semibold text-primary">{matchPercent}%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Invoices */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              Παραστατικά
            </h2>
          </div>
          
          {invoices.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-12">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Δεν υπάρχουν παραστατικά</p>
              <p className="text-sm text-muted-foreground mt-1">
                Πατήστε το + για να ανεβάσετε
              </p>
            </Card>
          ) : (
            <Card className="rounded-3xl overflow-hidden divide-y divide-border">
              {invoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{inv.merchant || inv.file_name}</p>
                        {getStatusBadge(inv)}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="capitalize">{inv.category === "airline" ? "✈️" : inv.category === "hotel" ? "🏨" : inv.category === "tolls" ? "🛣️" : "📄"} {inv.category}</span>
                        {inv.invoice_date && <span>{format(new Date(inv.invoice_date), "dd/MM/yyyy")}</span>}
                      </div>
                      {inv.matchedTransaction && (
                        <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Ταιριάζει με: {inv.matchedTransaction.description.slice(0, 30)}...
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold">€{inv.amount?.toFixed(2) || "—"}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </Card>
          )}
        </div>

        {/* Right: Bank Transactions */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-5 w-5 text-primary" />
              Τραπεζικές Κινήσεις
            </h2>
          </div>

          {transactions.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-12">
              <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Δεν υπάρχουν κινήσεις</p>
              <p className="text-sm text-muted-foreground mt-1">
                Συνδέστε κινήσεις από το Bank Sync
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Suggested Matches */}
              {suggestedMatches.length > 0 && (
                <Card className="rounded-3xl overflow-hidden border-primary/30 bg-primary/5">
                  <div className="p-4 border-b border-primary/20 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Προτεινόμενες Αντιστοιχίσεις</span>
                  </div>
                  <div className="divide-y divide-primary/10">
                    {suggestedMatches.map((txn) => {
                      const matchingInvoice = invoices.find(
                        (inv) => inv.amount && Math.abs(txn.amount - inv.amount) <= 1
                      );
                      
                      return (
                        <div key={txn.id} className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{txn.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(txn.transaction_date), "dd/MM/yyyy")}
                              </p>
                            </div>
                            <p className="font-semibold shrink-0">€{Math.abs(txn.amount).toFixed(2)}</p>
                            <Button
                              size="sm"
                              className="shrink-0 rounded-xl gap-1.5"
                              onClick={() => linkTransactionToInvoice(txn.id)}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                              Link
                            </Button>
                          </div>
                          {matchingInvoice && (
                            <p className="mt-2 text-xs text-primary flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Ταιριάζει με: {matchingInvoice.merchant || matchingInvoice.file_name}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* All Transactions */}
              <Card className="rounded-3xl overflow-hidden divide-y divide-border">
                {transactions.map((txn, i) => {
                  const isMatched = invoices.some(
                    (inv) => inv.matchedTransaction?.id === txn.id
                  );
                  
                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn("p-4 transition-colors", isMatched && "bg-green-50/50 dark:bg-green-950/20")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{txn.description}</p>
                            {isMatched && (
                              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(txn.transaction_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <p className={cn("font-semibold", txn.amount < 0 && "text-destructive")}>
                          €{Math.abs(txn.amount).toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
