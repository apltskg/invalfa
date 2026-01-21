import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CreditCard, CheckCircle2, AlertCircle, Link2, Sparkles, Upload, ExternalLink, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, BankTransaction, InvoiceTransactionMatch } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/upload/UploadModal";

type InvoiceWithMatch = Invoice & { matchedTransaction?: BankTransaction; matchId?: string };

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithMatch[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<InvoiceTransactionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("expenses");

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [{ data: pkgData }, { data: invData }, { data: txnData }, { data: matchData }] = await Promise.all([
      supabase.from("packages").select("*").eq("id", id).single(),
      supabase.from("invoices").select("*").eq("package_id", id),
      supabase.from("bank_transactions").select("*").eq("package_id", id),
      supabase.from("invoice_transaction_matches").select("*"),
    ]);

    setPkg(pkgData as Package | null);
    setMatches((matchData || []) as InvoiceTransactionMatch[]);

    const txns = (txnData as BankTransaction[]) || [];
    setTransactions(txns);

    // Match invoices with transactions using the matches table
    const invoicesWithMatches = ((invData as any[]) || []).map((inv) => {
      const match = (matchData || []).find((m: InvoiceTransactionMatch) => m.invoice_id === inv.id);
      const matchedTransaction = match ? txns.find(t => t.id === match.transaction_id) : undefined;
      return {
        ...inv,
        matchedTransaction,
        matchId: match?.id,
        type: inv.type || 'expense' // Default to expense
      } as InvoiceWithMatch;
    });

    setInvoices(invoicesWithMatches);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  async function createMatch(invoiceId: string, transactionId: string) {
    setLinking(transactionId);

    try {
      const existingMatch = matches.find(
        m => m.invoice_id === invoiceId && m.transaction_id === transactionId
      );

      if (existingMatch) {
        toast.info("This match already exists");
        setLinking(null);
        return;
      }

      const { error } = await supabase.from("invoice_transaction_matches").insert([{
        invoice_id: invoiceId,
        transaction_id: transactionId,
        status: "confirmed"
      }]);

      if (error) {
        throw error;
      }

      toast.success("Match created successfully");
      await fetchData();
    } catch (error: any) {
      console.error("Match error:", error);
      toast.error(`Failed to create match: ${error.message}`);
    }

    setLinking(null);
  }

  async function openInvoicePreview(inv: Invoice) {
    try {
      const { data, error } = await supabase.storage
        .from("invoices")
        .createSignedUrl(inv.file_path, 3600);

      if (error || !data?.signedUrl) {
        toast.error("Failed to get file URL");
        return;
      }

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to open preview");
    }
  }

  // Calculated Financials
  const expenses = invoices.filter(i => i.type === 'expense');
  const income = invoices.filter(i => i.type === 'income');

  const totalExpenses = expenses.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalIncome = income.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const profit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

  // Quote Mode Logic
  const targetMargin = pkg?.target_margin_percent || 10;
  const suggestedPrice = totalExpenses * (1 + targetMargin / 100);

  const getStatusBadge = (inv: InvoiceWithMatch) => {
    if (inv.matchedTransaction) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-lg">Matched</Badge>;
    }
    if (inv.amount) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-lg">Unpaid</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-lg">Extracted</Badge>;
  };

  // Filter lists based on matches
  const unmatchedInvoices = invoices.filter(inv => !inv.matchedTransaction && inv.amount && inv.type === (activeTab === 'income' ? 'income' : 'expense'));
  const unmatchedTransactions = transactions.filter(txn =>
    !matches.some(m => m.transaction_id === txn.id) &&
    // Try to filter transactions by direction (roughly)
    (activeTab === 'income' ? txn.amount > 0 : txn.amount < 0)
  );

  // Suggested Matches
  const suggestedMatches = unmatchedTransactions.map(txn => {
    const matchingInvoice = unmatchedInvoices.find(
      inv => inv.amount && Math.abs(txn.amount) === inv.amount // Simple exact match for now, could be fuzzy
    );
    return matchingInvoice ? { transaction: txn, invoice: matchingInvoice } : null;
  }).filter(Boolean) as { transaction: BankTransaction; invoice: Invoice }[];


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

  if (!pkg) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate("/packages")} className="self-start -ml-2 rounded-xl gap-2 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4" />
          Back to Packages
        </Button>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Main Info Card */}
          <Card className="md:col-span-2 rounded-3xl p-6 bg-gradient-to-br from-card to-secondary/30 border-border/50">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="mb-2 rounded-lg capitalize">
                  {pkg.status}
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight">{pkg.client_name}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/50"></span>
                  {format(new Date(pkg.start_date), "MMM d")} - {format(new Date(pkg.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </Card>

          {/* Profit Dashboard */}
          <Card className="rounded-3xl p-6 bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium">Net Profit</p>
                <h2 className="text-3xl font-bold tracking-tight">€{profit.toFixed(2)}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none">
                    {margin.toFixed(1)}% Margin
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-primary-foreground/70">Expenses</p>
                  <p className="font-semibold text-lg">€{totalExpenses.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Revenue</p>
                  <p className="font-semibold text-lg">€{totalIncome.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quote Mode Suggestion */}
      {pkg.status === 'quote' && (
        <Card className="rounded-2xl p-4 bg-amber-500/10 border-amber-500/20 text-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium">Quote Suggestion</p>
              <p className="text-sm opacity-80">Based on {targetMargin}% markup on {totalExpenses} expenses.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Suggested Price</p>
            <p className="text-xl font-bold">€{suggestedPrice.toFixed(0)}</p>
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted p-1 rounded-2xl mb-6 w-full max-w-md mx-auto grid grid-cols-2">
          <TabsTrigger value="expenses" className="rounded-xl">Expenses (Out)</TabsTrigger>
          <TabsTrigger value="income" className="rounded-xl">Income (In)</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="grid gap-6 lg:grid-cols-2 animate-in slide-in-from-bottom-4 duration-500">
          {/* Left Column: Invoices */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {activeTab === 'expenses' ? 'Supplier Invoices' : 'Client Invoices'}
              </h2>
              <Button size="sm" onClick={() => setUploadModalOpen(true)} className="rounded-xl gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>

            <div className="space-y-3">
              {invoices.filter(i => i.type === (activeTab === 'expenses' ? 'expense' : 'income')).length === 0 ? (
                <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-12 bg-muted/20">
                  <p className="text-muted-foreground">No documents found</p>
                </Card>
              ) : (
                invoices
                  .filter(i => i.type === (activeTab === 'expenses' ? 'expense' : 'income'))
                  .map((inv, i) => (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card
                        className="p-4 rounded-2xl hover:bg-muted/50 cursor-pointer transition-colors border-border/50"
                        onClick={() => openInvoicePreview(inv)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{inv.merchant || 'Unknown Merchant'}</span>
                              {getStatusBadge(inv)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="bg-secondary px-2 py-0.5 rounded text-secondary-foreground capitalize">
                                {inv.category}
                              </span>
                              <span>{inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : 'No date'}</span>
                            </div>
                            {inv.matchedTransaction && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                Matched
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">€{inv.amount?.toFixed(2)}</p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
              )}
            </div>
          </div>

          {/* Right Column: Bank Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Bank Transactions
              </h2>
              <Badge variant="outline" className="rounded-lg">
                Show {activeTab === 'expenses' ? 'Debits' : 'Credits'}
              </Badge>
            </div>

            {/* Suggestions Area */}
            {suggestedMatches.length > 0 && (
              <Card className="rounded-3xl overflow-hidden border-primary/20 bg-primary/5 mb-4">
                <div className="p-3 border-b border-primary/10 bg-primary/10 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">Smart Suggestions</span>
                </div>
                <div className="divide-y divide-primary/10">
                  {suggestedMatches.map(({ transaction, invoice }) => (
                    <div key={transaction.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Matches {invoice.merchant} (€{invoice.amount})</p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-xl h-8 text-xs gap-1"
                        onClick={() => createMatch(invoice.id, transaction.id)}
                        disabled={linking === transaction.id}
                      >
                        <Link2 className="h-3 w-3" />
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Transactions List */}
            <div className="space-y-3">
              {transactions
                .filter(t => activeTab === 'expenses' ? t.amount < 0 : t.amount > 0)
                .map((txn, i) => {
                  const isMatched = matches.some(m => m.transaction_id === txn.id);
                  return (
                    <Card
                      key={txn.id}
                      className={cn(
                        "p-4 rounded-2xl border-border/50 transition-colors",
                        isMatched ? "bg-muted/30 opacity-60" : "bg-card"
                      )}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{txn.description}</p>
                            {isMatched && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(txn.transaction_date), "dd MMM")}
                          </p>
                        </div>
                        <p className={cn("font-semibold", txn.amount < 0 ? "text-foreground" : "text-green-600")}>
                          {txn.amount < 0 ? '-' : '+'}€{Math.abs(txn.amount).toFixed(2)}
                        </p>
                      </div>
                    </Card>
                  );
                })
              }
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        packageId={id}
        onUploadComplete={fetchData}
        defaultType={activeTab === 'expenses' ? 'expense' : 'income'}
      />
    </div>
  );
}
